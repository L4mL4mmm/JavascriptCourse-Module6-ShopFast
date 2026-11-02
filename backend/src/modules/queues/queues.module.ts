import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullBoardModule } from '@bull-board/nestjs';
import { ExpressAdapter } from '@bull-board/express';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import {
  QUEUE_EMAIL,
  QUEUE_INVOICE,
  QUEUE_PARTNER_SYNC,
  QUEUE_DLQ,
} from './queues.constants';
import { QueueProducerService } from './queue-producer.service';
import { EmailProcessor } from './processors/email.processor';
import { InvoiceProcessor } from './processors/invoice.processor';
import { PartnerSyncProcessor } from './processors/partner-sync.processor';
import { CronTasksService } from './services/cron-tasks.service';
import { Order } from '../orders/entities/order.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order]),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('redis.host', 'localhost'),
          port: configService.get<number>('redis.port', 6379),
          password: configService.get<string>('redis.password', undefined) || undefined,
        },
      }),
    }),
    BullModule.registerQueue(
      { name: QUEUE_EMAIL },
      { name: QUEUE_INVOICE },
      { name: QUEUE_PARTNER_SYNC },
      { name: QUEUE_DLQ },
    ),
    // BullMQ Admin Dashboard mounted at /admin/queues
    BullBoardModule.forRoot({
      route: '/admin/queues',
      adapter: ExpressAdapter,
    }),
    BullBoardModule.forFeature(
      { name: QUEUE_EMAIL, adapter: BullMQAdapter as any },
      { name: QUEUE_INVOICE, adapter: BullMQAdapter as any },
      { name: QUEUE_PARTNER_SYNC, adapter: BullMQAdapter as any },
      { name: QUEUE_DLQ, adapter: BullMQAdapter as any },
    ),
  ],
  providers: [
    QueueProducerService,
    EmailProcessor,
    InvoiceProcessor,
    PartnerSyncProcessor,
    CronTasksService,
  ],
  exports: [QueueProducerService, BullModule],
})
export class QueuesModule {}
