import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { OrdersService } from './orders.service';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Product } from '../products/entities/product.entity';
import { User } from '../users/entities/user.entity';
import { QueueProducerService } from '../queues/queue-producer.service';
import { OrderEventsGateway } from '../events/order-events.gateway';
import { CacheService } from '../cache/cache.service';
import { ProductsService } from '../products/products.service';
import { OrderStatus, Role } from '../../common/enums';

describe('OrdersService', () => {
  let service: OrdersService;
  let mockOrderRepo: any;
  let mockUserRepo: any;
  let mockQueueProducer: any;
  let mockEventsGateway: any;
  let mockProductsService: any;
  let mockDataSource: any;
  let mockQueryRunner: any;

  const mockCustomer = {
    id: 'cust-1',
    email: 'cust@shopfast.vn',
    fullName: 'Customer Test',
  };

  const mockProduct = {
    id: 'prod-1',
    sku: 'IPHONE-15-PRO-256',
    name: 'iPhone 15 Pro Max',
    price: 30000000,
    stock: 10,
    isActive: true,
  };

  beforeEach(async () => {
    mockQueryRunner = {
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockResolvedValue(undefined),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
      manager: {
        findOne: jest.fn().mockImplementation((entity, opts) => {
          if (entity === Product) {
            return Promise.resolve({ ...mockProduct });
          }
          return Promise.resolve(null);
        }),
        save: jest.fn().mockImplementation((entity, data) => Promise.resolve({ id: 'saved-id', ...data })),
        create: jest.fn().mockImplementation((entity, data) => ({ ...data })),
      },
    };

    mockDataSource = {
      createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
    };

    mockOrderRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockImplementation(({ where }) => {
        return Promise.resolve({
          id: where.id || 'order-1',
          orderNumber: 'SF-20261102-1234',
          customerId: 'cust-1',
          status: OrderStatus.PENDING,
          totalAmount: 30000000,
          items: [],
        });
      }),
      save: jest.fn().mockImplementation((o) => Promise.resolve(o)),
    };

    mockUserRepo = {
      findOne: jest.fn().mockResolvedValue(mockCustomer),
    };

    mockQueueProducer = {
      addOrderConfirmationJob: jest.fn().mockResolvedValue(undefined),
      addInvoiceJob: jest.fn().mockResolvedValue(undefined),
      addPartnerSyncJob: jest.fn().mockResolvedValue(undefined),
    };

    mockEventsGateway = {
      broadcastOrderStatus: jest.fn(),
    };

    mockProductsService = {
      invalidateProductCache: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getRepositoryToken(Order), useValue: mockOrderRepo },
        { provide: getRepositoryToken(OrderItem), useValue: {} },
        { provide: getRepositoryToken(Product), useValue: {} },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: DataSource, useValue: mockDataSource },
        { provide: QueueProducerService, useValue: mockQueueProducer },
        { provide: OrderEventsGateway, useValue: mockEventsGateway },
        { provide: CacheService, useValue: {} },
        { provide: ProductsService, useValue: mockProductsService },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  it('should checkout successfully, deduct stock, commit transaction, and enqueue jobs', async () => {
    const res = await service.checkout('cust-1', {
      items: [{ productId: 'prod-1', quantity: 2 }],
      shippingAddress: '123 Le Loi, Q1',
      contactPhone: '0901234567',
    });

    expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
    expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    expect(mockQueueProducer.addOrderConfirmationJob).toHaveBeenCalled();
    expect(mockQueueProducer.addInvoiceJob).toHaveBeenCalled();
    expect(mockEventsGateway.broadcastOrderStatus).toHaveBeenCalled();
    expect(res.totalAmount).toBe(60000000);
  });

  it('should rollback and throw BadRequestException when product stock is insufficient', async () => {
    mockQueryRunner.manager.findOne.mockResolvedValueOnce({
      ...mockProduct,
      stock: 1, // only 1 in stock, but request 5
    });

    await expect(
      service.checkout('cust-1', {
        items: [{ productId: 'prod-1', quantity: 5 }],
        shippingAddress: '123 Le Loi, Q1',
        contactPhone: '0901234567',
      }),
    ).rejects.toThrow(BadRequestException);

    expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
  });

  it('should update order status and broadcast realtime websocket event', async () => {
    const updated = await service.updateStatus('order-1', {
      status: OrderStatus.PROCESSING,
      notes: 'Đang đóng gói',
    });

    expect(updated.status).toBe(OrderStatus.PROCESSING);
    expect(mockEventsGateway.broadcastOrderStatus).toHaveBeenCalledWith(
      'order-1',
      'SF-20261102-1234',
      OrderStatus.PROCESSING,
      expect.any(Object),
    );
  });
});
