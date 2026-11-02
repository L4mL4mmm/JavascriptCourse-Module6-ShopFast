import { InvoiceProcessor } from './invoice.processor';

describe('InvoiceProcessor', () => {
  let processor: InvoiceProcessor;
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

    processor = new InvoiceProcessor(mockCacheService as any, mockQueueProducer as any);
  });

  it('should process invoice generation and return invoicePdfUrl', async () => {
    const job = {
      id: 'inv-1',
      data: {
        orderId: 'o1',
        orderNumber: 'SF-1001',
        customerName: 'Test',
        totalAmount: 1000,
      },
    } as any;

    const res = await processor.process(job);
    expect(res.success).toBe(true);
    expect(res.invoicePdfUrl).toContain('SF-1001.pdf');
    expect(mockCacheService.set).toHaveBeenCalled();
  });

  it('should skip already generated invoices', async () => {
    mockCacheService.get.mockResolvedValueOnce({ invoicePdfUrl: 'http://existing.pdf' });

    const job = {
      id: 'inv-1',
      data: { orderId: 'o1' },
    } as any;

    const res = await processor.process(job);
    expect(res.skipped).toBe(true);
  });
});
