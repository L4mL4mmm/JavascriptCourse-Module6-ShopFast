import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_EMAIL, JOB_EMAIL_ORDER_CONFIRMATION, JOB_EMAIL_UNPAID_REMINDER } from '../queues.constants';
import { CacheService } from '../../cache/cache.service';
import { QueueProducerService } from '../queue-producer.service';

@Processor(QUEUE_EMAIL)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(
    private readonly cacheService: CacheService,
    private readonly queueProducer: QueueProducerService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { name, data, id } = job;
    this.logger.log(`Processing email job [${id}] - Type: ${name}`);

    // Enforce Job Idempotency (F05)
    const idempotencyKey = `idempotency:email:${id || data.orderId}:${name}`;
    const alreadyProcessed = await this.cacheService.get(idempotencyKey);
    if (alreadyProcessed) {
      this.logger.warn(`[Idempotency] Job ${id} (${name}) already processed! Skipping.`);
      return { skipped: true, reason: 'idempotent_duplicate' };
    }

    if (name === JOB_EMAIL_ORDER_CONFIRMATION) {
      this.logger.log(
        `[Email Sent] Gửi email xác nhận đơn hàng #${data.orderNumber} tới ${data.customerEmail}. Tổng tiền: ${data.totalAmount} VNĐ`,
      );
    } else if (name === JOB_EMAIL_UNPAID_REMINDER) {
      this.logger.log(
        `[Email Sent] Gửi email nhắc nhở thanh toán đơn hàng #${data.orderNumber} tới ${data.customerEmail}.`,
      );
    }

    // Mark as processed in cache with 24h TTL
    await this.cacheService.set(idempotencyKey, { processedAt: new Date().toISOString() }, 86400);

    return { success: true, processedAt: new Date().toISOString() };
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job, err: Error) {
    this.logger.error(`Job ${job.id} in ${QUEUE_EMAIL} failed (Attempt ${job.attemptsMade} of 5): ${err.message}`);
    if (job.attemptsMade >= 5) {
      await this.queueProducer.moveToDlq(QUEUE_EMAIL, job.data, err.message, job.attemptsMade);
    }
  }
}
