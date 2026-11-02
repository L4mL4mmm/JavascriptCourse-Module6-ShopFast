import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  QUEUE_EMAIL,
  QUEUE_INVOICE,
  QUEUE_PARTNER_SYNC,
  QUEUE_DLQ,
  JOB_EMAIL_ORDER_CONFIRMATION,
  JOB_INVOICE_GENERATE,
  JOB_PARTNER_SYNC_INVENTORY,
  JOB_EMAIL_UNPAID_REMINDER,
} from './queues.constants';

@Injectable()
export class QueueProducerService {
  private readonly logger = new Logger(QueueProducerService.name);

  constructor(
    @InjectQueue(QUEUE_EMAIL) private readonly emailQueue: Queue,
    @InjectQueue(QUEUE_INVOICE) private readonly invoiceQueue: Queue,
    @InjectQueue(QUEUE_PARTNER_SYNC) private readonly partnerSyncQueue: Queue,
    @InjectQueue(QUEUE_DLQ) private readonly dlqQueue: Queue,
  ) {}

  /**
   * Enqueue Order Confirmation Email
   */
  async addOrderConfirmationJob(data: {
    orderId: string;
    orderNumber: string;
    customerEmail: string;
    customerName: string;
    totalAmount: number;
    items: any[];
  }) {
    const jobId = `order-confirm-${data.orderId}`;
    this.logger.log(`Dispatching order confirmation email job [${jobId}]`);
    return await this.emailQueue.add(JOB_EMAIL_ORDER_CONFIRMATION, data, {
      jobId,
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 2000, // 2s, 4s, 8s, 16s, 32s
      },
      removeOnComplete: 100,
      removeOnFail: false,
    });
  }

  /**
   * Enqueue Invoice Generation
   */
  async addInvoiceJob(data: {
    orderId: string;
    orderNumber: string;
    customerName: string;
    totalAmount: number;
    items: any[];
  }) {
    const jobId = `invoice-${data.orderId}`;
    this.logger.log(`Dispatching invoice PDF generation job [${jobId}]`);
    return await this.invoiceQueue.add(JOB_INVOICE_GENERATE, data, {
      jobId,
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: 100,
      removeOnFail: false,
    });
  }

  /**
   * Enqueue Partner Sync Inventory Job
   */
  async addPartnerSyncJob(data: { sku: string; stockDelta: number; source: string }) {
    const jobId = `partner-sync-${data.sku}-${Date.now()}`;
    return await this.partnerSyncQueue.add(JOB_PARTNER_SYNC_INVENTORY, data, {
      jobId,
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: 100,
      removeOnFail: false,
    });
  }

  /**
   * Enqueue Unpaid Order Reminder Email
   */
  async addUnpaidReminderJob(data: { orderId: string; orderNumber: string; customerEmail: string }) {
    const jobId = `unpaid-reminder-${data.orderId}-${Date.now()}`;
    return await this.emailQueue.add(JOB_EMAIL_UNPAID_REMINDER, data, {
      jobId,
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
  }

  /**
   * Move failed job to Dead Letter Queue (DLQ)
   */
  async moveToDlq(originalQueue: string, jobData: any, failedReason: string, attempts: number) {
    this.logger.error(`[DLQ Routing] Job from queue '${originalQueue}' failed after ${attempts} attempts. Sending to DLQ.`);
    return await this.dlqQueue.add('dead-letter-job', {
      originalQueue,
      jobData,
      failedReason,
      failedAt: new Date().toISOString(),
      attemptsMade: attempts,
    });
  }
}
