import { CronTasksService } from './cron-tasks.service';
import { OrderStatus, PaymentStatus } from '../../../common/enums';

describe('CronTasksService', () => {
  let service: CronTasksService;
  let mockOrderRepo: any;
  let mockQueueProducer: any;
  let mockCacheService: any;

  beforeEach(() => {
    mockOrderRepo = {
      find: jest.fn().mockResolvedValue([
        {
          id: 'o1',
          orderNumber: 'SF-1001',
          paymentStatus: PaymentStatus.UNPAID,
          status: OrderStatus.PENDING,
          customer: { email: 'customer@shopfast.vn' },
        },
      ]),
    };
    mockQueueProducer = {
      addUnpaidReminderJob: jest.fn().mockResolvedValue(undefined),
    };
    mockCacheService = {
      set: jest.fn().mockResolvedValue(undefined),
    };

    service = new CronTasksService(
      mockOrderRepo as any,
      mockQueueProducer as any,
      mockCacheService as any,
    );
  });

  it('should find unpaid orders and enqueue reminder emails', async () => {
    await service.handleUnpaidOrderReminders();
    expect(mockOrderRepo.find).toHaveBeenCalled();
    expect(mockQueueProducer.addUnpaidReminderJob).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: 'o1',
        customerEmail: 'customer@shopfast.vn',
      }),
    );
  });

  it('should calculate revenue report correctly', async () => {
    mockOrderRepo.find.mockResolvedValueOnce([
      { totalAmount: 1000000, paymentStatus: PaymentStatus.PAID, status: OrderStatus.DELIVERED },
      { totalAmount: 2000000, paymentStatus: PaymentStatus.PAID, status: OrderStatus.CONFIRMED },
      { totalAmount: 500000, paymentStatus: PaymentStatus.UNPAID, status: OrderStatus.CANCELLED },
    ]);

    const report = await service.calculateRevenueReport(new Date(), new Date());

    expect(report.totalOrders).toBe(3);
    expect(report.paidOrdersCount).toBe(2);
    expect(report.totalRevenue).toBe(3000000);
    expect(report.averageOrderValue).toBe(1500000);
    expect(mockCacheService.set).toHaveBeenCalled();
  });
});
