import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import * as crypto from 'crypto';

export const NULL_CACHE_SENTINEL = '__SF_NULL__';

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private client: Redis | null = null;
  private isConnected = false;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    this.initRedis();
  }

  private initRedis() {
    try {
      const host = this.configService.get<string>('redis.host', 'localhost');
      const port = this.configService.get<number>('redis.port', 6379);
      const password = this.configService.get<string>('redis.password', undefined);

      this.client = new Redis({
        host,
        port,
        password: password || undefined,
        enableOfflineQueue: false,
        maxRetriesPerRequest: 1,
        retryStrategy: () => 5000,
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        this.logger.log(`Redis cache connected to ${host}:${port}`);
      });

      this.client.on('error', (err) => {
        if (this.isConnected) {
          this.logger.warn(`Redis cache connection lost: ${err.message}. Resilient fallback active.`);
        }
        this.isConnected = false;
      });
    } catch (error: any) {
      this.logger.warn(`Failed to connect Redis: ${error.message}. Running in fallback mode.`);
      this.isConnected = false;
    }
  }

  getClient(): Redis | null {
    return this.client;
  }

  isAvailable(): boolean {
    return this.isConnected && this.client !== null;
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isAvailable()) return null;
    try {
      const data = await this.client!.get(key);
      if (!data) return null;
      if (data === NULL_CACHE_SENTINEL) {
        return NULL_CACHE_SENTINEL as any;
      }
      return JSON.parse(data) as T;
    } catch (err: any) {
      this.logger.warn(`Cache get failed for key ${key}: ${err.message}`);
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds = 300): Promise<void> {
    if (!this.isAvailable()) return;
    try {
      const serialized = typeof value === 'string' && value === NULL_CACHE_SENTINEL
        ? NULL_CACHE_SENTINEL
        : JSON.stringify(value);

      if (ttlSeconds > 0) {
        await this.client!.set(key, serialized, 'EX', ttlSeconds);
      } else {
        await this.client!.set(key, serialized);
      }
    } catch (err: any) {
      this.logger.warn(`Cache set failed for key ${key}: ${err.message}`);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.isAvailable()) return;
    try {
      await this.client!.del(key);
    } catch (err: any) {
      this.logger.warn(`Cache del failed for key ${key}: ${err.message}`);
    }
  }

  async delByPattern(pattern: string): Promise<void> {
    if (!this.isAvailable()) return;
    try {
      const keys = await this.client!.keys(pattern);
      if (keys && keys.length > 0) {
        await this.client!.del(...keys);
        this.logger.debug(`Invalidated ${keys.length} keys matching pattern: ${pattern}`);
      }
    } catch (err: any) {
      this.logger.warn(`Cache delByPattern failed for pattern ${pattern}: ${err.message}`);
    }
  }

  /**
   * Acquire a distributed Mutex lock using SET key token NX PX ttlMs
   */
  async acquireLock(lockKey: string, ttlMs = 5000): Promise<string | null> {
    if (!this.isAvailable()) return null;
    try {
      const token = crypto.randomUUID();
      const acquired = await this.client!.set(`lock:${lockKey}`, token, 'PX', ttlMs, 'NX');
      return acquired === 'OK' ? token : null;
    } catch (err: any) {
      this.logger.warn(`AcquireLock error for ${lockKey}: ${err.message}`);
      return null;
    }
  }

  /**
   * Release lock safely using atomic Lua script
   */
  async releaseLock(lockKey: string, token: string): Promise<boolean> {
    if (!this.isAvailable() || !token) return false;
    try {
      const luaScript = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;
      const res = await this.client!.eval(luaScript, 1, `lock:${lockKey}`, token);
      return res === 1;
    } catch (err: any) {
      this.logger.warn(`ReleaseLock error for ${lockKey}: ${err.message}`);
      return false;
    }
  }

  /**
   * High-Performance Cache Stampede Prevention with Mutex & Null Caching
   * If Redis fails, seamlessly fallbacks to fetchFn() without throwing!
   */
  async getOrSetWithLock<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttlSeconds = 300,
    nullTtlSeconds = 60,
  ): Promise<T> {
    // 1. If Redis is down, fallback to database query
    if (!this.isAvailable()) {
      return await fetchFn();
    }

    try {
      // 2. Check cache
      const cached = await this.get<T>(key);
      if (cached === (NULL_CACHE_SENTINEL as any)) {
        return null as any;
      }
      if (cached !== null) {
        return cached;
      }

      // 3. Cache Miss - Acquire distributed lock to prevent Cache Stampede
      const lockKey = `stampede:${key}`;
      const token = await this.acquireLock(lockKey, 3000);

      if (token) {
        try {
          // Double check cache in case another process populated it
          const secondCheck = await this.get<T>(key);
          if (secondCheck === (NULL_CACHE_SENTINEL as any)) {
            return null as any;
          }
          if (secondCheck !== null) {
            return secondCheck;
          }

          // Fetch fresh data from primary DB
          const result = await fetchFn();

          if (result === null || result === undefined) {
            // Null Caching: Cache sentinel with short TTL to prevent penetration
            await this.set(key, NULL_CACHE_SENTINEL, nullTtlSeconds);
          } else {
            // Cache valid data
            await this.set(key, result, ttlSeconds);
          }

          return result;
        } finally {
          await this.releaseLock(lockKey, token);
        }
      } else {
        // Another thread is updating the cache; wait briefly and check once, then fallback to fetchFn
        await new Promise((resolve) => setTimeout(resolve, 80));
        const retryCache = await this.get<T>(key);
        if (retryCache === (NULL_CACHE_SENTINEL as any)) return null as any;
        if (retryCache !== null) return retryCache;

        return await fetchFn();
      }
    } catch (err: any) {
      this.logger.warn(`CacheStampede wrapper failed for ${key}: ${err.message}. Calling DB fallback.`);
      return await fetchFn();
    }
  }

  onModuleDestroy() {
    if (this.client) {
      this.client.disconnect();
    }
  }
}
