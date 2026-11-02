import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrderStatus, PaymentStatus } from '../../common/enums';

describe('OrdersController', () => {
  let controller: OrdersController;
  let mockOrdersService: any;

  beforeEach(() => {
    mockOrdersService = {
      checkout: jest.fn().mockResolvedValue({ id: 'o1', totalAmount: 100 }),
      findAll: jest.fn().mockResolvedValue([{ id: 'o1' }]),
      findById: jest.fn().mockResolvedValue({ id: 'o1' }),
      updateStatus: jest.fn().mockResolvedValue({ id: 'o1', status: OrderStatus.CONFIRMED }),
      updatePaymentStatus: jest.fn().mockResolvedValue({ id: 'o1', paymentStatus: PaymentStatus.PAID }),
    };

    controller = new OrdersController(mockOrdersService as OrdersService);
  });

  it('should checkout order', async () => {
    const user = { userId: 'u1', role: 'CUSTOMER', email: 'a@b.com' };
    const res = await controller.checkout(user, { items: [], shippingAddress: 'Addr', contactPhone: '123' });
    expect(res.id).toBe('o1');
  });

  it('should find all orders', async () => {
    const user = { userId: 'u1', role: 'CUSTOMER', email: 'a@b.com' };
    const res = await controller.findAll(user);
    expect(res.length).toBe(1);
  });

  it('should find one order', async () => {
    const user = { userId: 'u1', role: 'CUSTOMER', email: 'a@b.com' };
    const res = await controller.findOne('o1', user);
    expect(res.id).toBe('o1');
  });

  it('should update order status', async () => {
    const user = { userId: 'u1', role: 'ADMIN', email: 'a@b.com' };
    const res = await controller.updateStatus('o1', { status: OrderStatus.CONFIRMED }, user);
    expect(res.status).toBe(OrderStatus.CONFIRMED);
  });

  it('should update payment status', async () => {
    const res = await controller.updatePayment('o1', { paymentStatus: PaymentStatus.PAID });
    expect(res.paymentStatus).toBe(PaymentStatus.PAID);
  });
});
