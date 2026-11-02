import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TicketsService } from './tickets.service';
import { Ticket } from './entities/ticket.entity';
import { Order } from '../orders/entities/order.entity';
import { Product } from '../products/entities/product.entity';
import { OrderEventsGateway } from '../events/order-events.gateway';
import { ProductsService } from '../products/products.service';
import { OrderStatus, ProposalStatus, TicketStatus } from '../../common/enums';

describe('TicketsService', () => {
  let service: TicketsService;
  let mockTicketRepo: any;
  let mockOrderRepo: any;
  let mockProductRepo: any;
  let mockEventsGateway: any;
  let mockProductsService: any;

  const mockTicket = {
    id: 'ticket-1',
    ticketNumber: 'PROP-202611-1001',
    customerId: 'cust-1',
    status: TicketStatus.PENDING_CONFIRMATION,
    proposalStatus: ProposalStatus.PENDING,
    orderId: 'order-1',
    proposedAction: 'CANCEL_ORDER',
    actionPayload: { orderId: 'order-1' },
  };

  const mockOrder = {
    id: 'order-1',
    orderNumber: 'SF-20261102-1001',
    status: OrderStatus.CONFIRMED,
    items: [{ productId: 'prod-1', quantity: 2 }],
  };

  const mockProduct = {
    id: 'prod-1',
    sku: 'IPHONE-15-PRO-256',
    stock: 10,
  };

  beforeEach(async () => {
    mockTicketRepo = {
      create: jest.fn().mockImplementation((d) => ({ id: 'ticket-1', ...d })),
      save: jest.fn().mockImplementation((t) => Promise.resolve(t)),
      findOne: jest.fn().mockImplementation(({ where }) => {
        return Promise.resolve(where.id === 'ticket-1' ? { ...mockTicket } : null);
      }),
      find: jest.fn().mockResolvedValue([mockTicket]),
    };

    mockOrderRepo = {
      findOne: jest.fn().mockResolvedValue({ ...mockOrder }),
      save: jest.fn().mockImplementation((o) => Promise.resolve(o)),
    };

    mockProductRepo = {
      findOne: jest.fn().mockResolvedValue({ ...mockProduct }),
      save: jest.fn().mockImplementation((p) => Promise.resolve(p)),
    };

    mockEventsGateway = {
      broadcastOrderStatus: jest.fn(),
    };

    mockProductsService = {
      invalidateProductCache: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        { provide: getRepositoryToken(Ticket), useValue: mockTicketRepo },
        { provide: getRepositoryToken(Order), useValue: mockOrderRepo },
        { provide: getRepositoryToken(Product), useValue: mockProductRepo },
        { provide: OrderEventsGateway, useValue: mockEventsGateway },
        { provide: ProductsService, useValue: mockProductsService },
      ],
    }).compile();

    service = module.get<TicketsService>(TicketsService);
  });

  it('should approve a CANCEL_ORDER proposal, cancel the order, restore inventory, and broadcast', async () => {
    const result = await service.confirmProposal('ticket-1', 'agent-1', {
      decision: 'APPROVE',
      notes: 'Đồng ý hủy đơn theo yêu cầu của khách hàng',
    });

    expect(result.executed).toBe(true);
    expect(result.ticket.proposalStatus).toBe(ProposalStatus.APPROVED);
    expect(mockOrderRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: OrderStatus.CANCELLED }),
    );
    // Inventory restored (10 + 2 = 12)
    expect(mockProductRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ stock: 12 }),
    );
    expect(mockEventsGateway.broadcastOrderStatus).toHaveBeenCalled();
  });

  it('should reject a proposal and close ticket without modifying order state', async () => {
    const result = await service.confirmProposal('ticket-1', 'agent-1', {
      decision: 'REJECT',
      notes: 'Đơn hàng đã được giao cho shipper, không thể hủy',
    });

    expect(result.executed).toBe(false);
    expect(result.ticket.proposalStatus).toBe(ProposalStatus.REJECTED);
    expect(result.ticket.status).toBe(TicketStatus.CLOSED);
    expect(mockOrderRepo.save).not.toHaveBeenCalled();
  });
});
