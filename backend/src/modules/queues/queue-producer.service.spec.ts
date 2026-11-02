import { QueueProducerService } from './queue-producer.service';

describe('QueueProducerService', () => {
  let service: QueueProducerService;
  let mockEmailQueue: any;
  let mockInvoiceQueue: any;
  let mockPartnerSyncQueue: any;
  let mockDlqQueue: any;

  beforeEach(() => {
    mockEmailQueue = { add: jest.fn().mockResolvedValue({ id: 'j1' }) };
    mockInvoiceQueue = { add: jest.fn().mockResolvedValue({ id: 'j2' }) };
    mockPartnerSyncQueue = { add: jest.fn().mockResolvedValue({ id: 'j3' }) };
    mockDlqQueue = { add: jest.fn().mockResolvedValue({ id: 'j4' }) };

    service = new QueueProducerService(
      mockEmailQueue as any,
      mockInvoiceQueue as any,
      mockPartnerSyncQueue as any,
      mockDlqQueue as any,
    );
  });

  it('should enqueue order confirmation email', async () => {
    const res = await service.addOrderConfirmationJob({
      orderId: 'o1',
      orderNumber: 'SF-1',
      customerEmail: 'a@b.com',
      customerName: 'A',
      totalAmount: 1000,
      items: [],
    });
    expect(res).toBeDefined();
    expect(mockEmailQueue.add).toHaveBeenCalled();
  });

  it('should enqueue invoice PDF generation', async () => {
    const res = await service.addInvoiceJob({
      orderId: 'o1',
      orderNumber: 'SF-1',
      customerName: 'A',
      totalAmount: 1000,
      items: [],
    });
    expect(res).toBeDefined();
    expect(mockInvoiceQueue.add).toHaveBeenCalled();
  });

  it('should enqueue partner inventory sync', async () => {
    const res = await service.addPartnerSyncJob({ sku: 'SKU1', stockDelta: -1, source: 'test' });
    expect(res).toBeDefined();
    expect(mockPartnerSyncQueue.add).toHaveBeenCalled();
  });

  it('should route failed job to DLQ', async () => {
    const res = await service.moveToDlq('email', { orderId: 'o1' }, 'Connection timeout', 5);
    expect(res).toBeDefined();
    expect(mockDlqQueue.add).toHaveBeenCalled();
  });
});
