import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface';
import Redis from 'ioredis';

@Injectable()
export class ThrottlerStorageRedisService implements ThrottlerStorage, OnModuleDestroy {
  private readonly logger = new Logger(ThrottlerStorageRedisService.name);
  private redis: Redis | null = null;
  private readonly memoryFallback = new Map<string, { totalHits: number; expiresAt: number }>();
  private isRedisConnected = false;

  constructor() {
    this.initRedis();
  }

  private initRedis() {
    try {
      const host = process.env.REDIS_HOST || 'localhost';
      const port = Number(process.env.REDIS_PORT) || 6379;
      const password = process.env.REDIS_PASSWORD || undefined;

      this.redis = new Redis({
        host,
        port,
        password,
        enableOfflineQueue: false,
        maxRetriesPerRequest: 1,
        retryStrategy: () => 5000,
      });

      this.redis.on('connect', () => {
        this.isRedisConnected = true;
        this.logger.log('Redis connected successfully for Throttler Storage.');
      });

      this.redis.on('error', (err) => {
        if (this.isRedisConnected) {
          this.logger.warn(`Redis disconnected in Throttler Storage, falling back to memory: ${err.message}`);
        }
        this.isRedisConnected = false;
      });
    } catch (err: any) {
      this.logger.warn(`Failed to initialize Redis in Throttler Storage: ${err.message}. Using memory fallback.`);
      this.isRedisConnected = false;
    }
  }

  async increment(key: string, ttl: number): Promise<ThrottlerStorageRecord> {
    const prefixedKey = `throttle:${key}`;

    if (this.isRedisConnected && this.redis) {
      try {
        const ttlSeconds = Math.ceil(ttl / 1000);
        const multi = this.redis.multi();
        multi.incr(prefixedKey);
        multi.pttl(prefixedKey);

        const results = await multi.exec();
        if (results && results[0] && results[1]) {
          const totalHits = results[0][1] as number;
          let pttl = results[1][1] as number;

          // If key was just created without TTL, set expiration
          if (pttl === -1 || pttl === -2) {
            await this.redis.pexpire(prefixedKey, ttl);
            pttl = ttl;
          }

          const timeToExpire = Math.max(0, Math.ceil(pttl / 1000));
          return { totalHits, timeToExpire };
        }
      } catch (err: any) {
        this.logger.warn(`Redis increment error: ${err.message}, falling back to memory.`);
      }
    }

    // Memory Fallback
    const now = Date.now();
    const entry = this.memoryFallback.get(prefixedKey);

    if (!entry || entry.expiresAt <= now) {
      const newEntry = { totalHits: 1, expiresAt: now + ttl };
      this.memoryFallback.set(prefixedKey, newEntry);
      return { totalHits: 1, timeToExpire: Math.ceil(ttl / 1000) };
    }

    entry.totalHits += 1;
    const timeToExpire = Math.max(0, Math.ceil((entry.expiresAt - now) / 1000));
    return { totalHits: entry.totalHits, timeToExpire };
  }

  onModuleDestroy() {
    if (this.redis) {
      this.redis.disconnect();
    }
  }
}
