import { EmailProcessor } from './email.processor';
import { JOB_EMAIL_ORDER_CONFIRMATION, JOB_EMAIL_UNPAID_REMINDER } from '../queues.constants';

describe('EmailProcessor', () => {
  let processor: EmailProcessor;
  let mockCacheService: any;
  let mockQueueProducer: any;

  beforeEach(() => {
    mockCacheService = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
    };
    mockQueueProducer = {
      moveToDlq: jest.fn().mockResolvedValue(undefined),
    };

    processor = new EmailProcessor(mockCacheService as any, mockQueueProducer as any);
  });

  it('should process order confirmation email and set idempotency key', async () => {
    const job = {
      id: 'job-1',
      name: JOB_EMAIL_ORDER_CONFIRMATION,
      data: {
        orderId: 'o1',
        orderNumber: 'SF-1',
        customerEmail: 'a@b.com',
        totalAmount: 100,
      },
    } as any;

    const res = await processor.process(job);
    expect(res.success).toBe(true);
    expect(mockCacheService.set).toHaveBeenCalled();
  });

  it('should skip duplicate job if already processed (idempotency)', async () => {
    mockCacheService.get.mockResolvedValueOnce({ processedAt: '2026-11-02' });

    const job = {
      id: 'job-1',
      name: JOB_EMAIL_ORDER_CONFIRMATION,
      data: { orderId: 'o1' },
    } as any;

    const res = await processor.process(job);
    expect(res.skipped).toBe(true);
  });

  it('should route to DLQ on 5th failed attempt', async () => {
    const job = {
      id: 'job-1',
      attemptsMade: 5,
      data: { orderId: 'o1' },
    } as any;

    await processor.onFailed(job, new Error('SMTP Timeout'));
    expect(mockQueueProducer.moveToDlq).toHaveBeenCalled();
  });
});
