import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_INVOICE } from '../queues.constants';
import { CacheService } from '../../cache/cache.service';
import { QueueProducerService } from '../queue-producer.service';

@Processor(QUEUE_INVOICE)
export class InvoiceProcessor extends WorkerHost {
  private readonly logger = new Logger(InvoiceProcessor.name);

  constructor(
    private readonly cacheService: CacheService,
    private readonly queueProducer: QueueProducerService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { data, id } = job;
    this.logger.log(`Generating Invoice PDF for Order #${data.orderNumber} (Job ${id})`);

    // Enforce Idempotency
    const idempotencyKey = `idempotency:invoice:${data.orderId}`;
    const alreadyProcessed = await this.cacheService.get(idempotencyKey);
    if (alreadyProcessed) {
      this.logger.warn(`[Idempotency] Invoice for order ${data.orderId} already generated! Skipping.`);
      return { skipped: true, reason: 'idempotent_duplicate' };
    }

    // Simulate PDF generation with metadata
    const invoicePdfUrl = `https://storage.shopfast.vn/invoices/inv_${data.orderNumber}.pdf`;
    this.logger.log(`[Invoice Generated] PDF created successfully: ${invoicePdfUrl} (Total: ${data.totalAmount} VNĐ)`);

    await this.cacheService.set(
      idempotencyKey,
      { invoicePdfUrl, generatedAt: new Date().toISOString() },
      86400 * 7, // 7 days
    );

    return { success: true, invoicePdfUrl };
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job, err: Error) {
    this.logger.error(`Job ${job.id} in ${QUEUE_INVOICE} failed (Attempt ${job.attemptsMade} of 5): ${err.message}`);
    if (job.attemptsMade >= 5) {
      await this.queueProducer.moveToDlq(QUEUE_INVOICE, job.data, err.message, job.attemptsMade);
    }
  }
}
