import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';

import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { CacheModule } from './modules/cache/cache.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProductsModule } from './modules/products/products.module';
import { OrdersModule } from './modules/orders/orders.module';
import { EventsModule } from './modules/events/events.module';
import { QueuesModule } from './modules/queues/queues.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { AiAgentModule } from './modules/ai-agent/ai-agent.module';
import { HealthModule } from './modules/health/health.module';

import { CustomThrottlerGuard } from './common/guards/custom-throttler.guard';
import { ThrottlerExceptionFilter } from './common/filters/throttler-exception.filter';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ThrottlerStorageRedisService } from './common/throttler/throttler-storage-redis.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            name: 'default',
            ttl: configService.get<number>('throttler.ttl', 60000),
            limit: configService.get<number>('throttler.limit', 100),
          },
        ],
        storage: new ThrottlerStorageRedisService(),
      }),
    }),
    DatabaseModule,
    CacheModule,
    UsersModule,
    AuthModule,
    ProductsModule,
    OrdersModule,
    EventsModule,
    QueuesModule,
    TicketsModule,
    AiAgentModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_FILTER,
      useClass: ThrottlerExceptionFilter,
    },
  ],
})
export class AppModule {}
