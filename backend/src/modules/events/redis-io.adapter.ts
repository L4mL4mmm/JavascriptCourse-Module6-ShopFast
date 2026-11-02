import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { Logger } from '@nestjs/common';

export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private adapterConstructor: ReturnType<typeof createAdapter> | null = null;

  async connectToRedis(host = 'localhost', port = 6379, password?: string): Promise<void> {
    try {
      const pubClient = new Redis({
        host,
        port,
        password: password || undefined,
        retryStrategy: () => 5000,
        enableOfflineQueue: false,
      });

      const subClient = pubClient.duplicate();

      pubClient.on('error', (err) => {
        this.logger.warn(`Redis Pub client error: ${err.message}`);
      });
      subClient.on('error', (err) => {
        this.logger.warn(`Redis Sub client error: ${err.message}`);
      });

      this.adapterConstructor = createAdapter(pubClient, subClient);
      this.logger.log(`Socket.io Redis Pub/Sub adapter initialized successfully on ${host}:${port}`);
    } catch (err: any) {
      this.logger.warn(`Failed to connect Redis for Socket.io adapter: ${err.message}. Using default in-memory adapter.`);
      this.adapterConstructor = null;
    }
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, {
      ...options,
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });

    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }

    return server;
  }
}
