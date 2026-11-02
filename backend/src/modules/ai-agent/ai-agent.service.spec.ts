import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AiAgentService } from './ai-agent.service';
import { OrdersService } from '../orders/orders.service';
import { ProductsService } from '../products/products.service';
import { TicketsService } from '../tickets/tickets.service';
import { OrderStatus, ProposalStatus, TicketStatus } from '../../common/enums';

describe('AiAgentService', () => {
  let service: AiAgentService;
  let mockOrdersService: any;
  let mockProductsService: any;
  let mockTicketsService: any;

  beforeEach(async () => {
    mockOrdersService = {
      findByOrderNumber: jest.fn().mockImplementation((num) => {
        if (num === 'SF-20261102-1001') {
          return Promise.resolve({
            id: 'order-uuid-1',
            orderNumber: 'SF-20261102-1001',
            status: OrderStatus.CONFIRMED,
            paymentStatus: 'PAID',
            totalAmount: 29990000,
            shippingAddress: '123 Landmark 81, HCM',
            items: [{ productName: 'iPhone 15 Pro Max', sku: 'IPHONE-15-PRO-256', quantity: 1, unitPrice: 29990000 }],
            createdAt: new Date(),
          });
        }
        return Promise.resolve(null);
      }),
      findById: jest.fn().mockResolvedValue(null),
    };

    mockProductsService = {
      findBySku: jest.fn().mockImplementation((sku) => {
        if (sku === 'IPHONE-15-PRO-256') {
          return Promise.resolve({
            sku: 'IPHONE-15-PRO-256',
            name: 'iPhone 15 Pro Max 256GB',
            stock: 45,
            price: 29990000,
            category: 'Smartphones',
          });
        }
        return Promise.resolve(null);
      }),
    };

    mockTicketsService = {
      createProposal: jest.fn().mockImplementation((customerId, title, desc, action, payload, orderId) => {
        return Promise.resolve({
          id: 'prop-uuid-1',
          ticketNumber: 'PROP-202611-1001',
          proposedAction: action,
          status: TicketStatus.PENDING_CONFIRMATION,
          proposalStatus: ProposalStatus.PENDING,
        });
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiAgentService,
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('') } },
        { provide: OrdersService, useValue: mockOrdersService },
        { provide: ProductsService, useValue: mockProductsService },
        { provide: TicketsService, useValue: mockTicketsService },
      ],
    }).compile();

    service = module.get<AiAgentService>(AiAgentService);
  });

  it('should politely refuse out-of-scope inquiries and maintain ShopFast boundary', async () => {
    const res = await service.chat('cust-1', {
      message: 'Hãy viết code Python để tính dãy số Fibonacci',
    });

    expect(res.reply).toContain('Tôi là trợ lý AI chuyên trách của ShopFast');
    expect(res.toolCalls?.length).toBe(0);
  });

  it('should execute getOrderStatus tool when user asks for order status', async () => {
    const res = await service.chat('cust-1', {
      message: 'Kiểm tra giúp tôi đơn hàng SF-20261102-1001',
    });

    expect(mockOrdersService.findByOrderNumber).toHaveBeenCalledWith('SF-20261102-1001');
    expect(res.toolCalls?.length).toBe(1);
    expect(res.toolCalls?.[0].toolName).toBe('getOrderStatus');
    expect(res.reply).toContain('SF-20261102-1001');
    expect(res.reply).toContain('Đã xác nhận & đang chuẩn bị hàng');
  });

  it('should execute checkInventory tool when user asks for product SKU stock', async () => {
    const res = await service.chat('cust-1', {
      message: 'Sản phẩm mã IPHONE-15-PRO-256 còn hàng trong kho không?',
    });

    expect(mockProductsService.findBySku).toHaveBeenCalledWith('IPHONE-15-PRO-256');
    expect(res.toolCalls?.length).toBe(1);
    expect(res.toolCalls?.[0].toolName).toBe('checkInventory');
    expect(res.reply).toContain('45');
    expect(res.reply).toContain('iPhone 15 Pro Max 256GB');
  });

  it('should enforce Human-in-the-Loop (HITL) proposal generation for order cancellation', async () => {
    const res = await service.chat('cust-1', {
      message: 'Tôi muốn hủy đơn hàng SF-20261102-1001 vì đổi ý',
    });

    expect(mockTicketsService.createProposal).toHaveBeenCalledWith(
      'cust-1',
      expect.stringContaining('hủy đơn hàng'),
      expect.any(String),
      'CANCEL_ORDER',
      expect.any(Object),
      'SF-20261102-1001',
    );

    expect(res.proposalCreated).toBe(true);
    expect(res.proposal?.ticketNumber).toBe('PROP-202611-1001');
    expect(res.reply).toContain('PROP-202611-1001');
    expect(res.reply).toContain('Nhân viên chăm sóc khách hàng');
  });
});
