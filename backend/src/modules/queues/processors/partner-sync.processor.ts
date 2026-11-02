import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_PARTNER_SYNC } from '../queues.constants';
import { QueueProducerService } from '../queue-producer.service';

@Processor(QUEUE_PARTNER_SYNC)
export class PartnerSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(PartnerSyncProcessor.name);

  constructor(private readonly queueProducer: QueueProducerService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { data, id } = job;
    this.logger.log(`Syncing SKU ${data.sku} inventory delta (${data.stockDelta}) with external logistics partner (Job ${id})`);

    // Simulated 3rd party API call
    return {
      synced: true,
      sku: data.sku,
      delta: data.stockDelta,
      syncedAt: new Date().toISOString(),
    };
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job, err: Error) {
    this.logger.error(`Job ${job.id} in ${QUEUE_PARTNER_SYNC} failed: ${err.message}`);
    if (job.attemptsMade >= 5) {
      await this.queueProducer.moveToDlq(QUEUE_PARTNER_SYNC, job.data, err.message, job.attemptsMade);
    }
  }
}
