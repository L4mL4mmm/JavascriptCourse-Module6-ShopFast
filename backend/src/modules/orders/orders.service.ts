import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Product } from '../products/entities/product.entity';
import { User } from '../users/entities/user.entity';
import { CreateOrderDto, UpdateOrderStatusDto, UpdatePaymentStatusDto } from './dto';
import { OrderStatus, PaymentStatus, Role } from '../../common/enums';
import { QueueProducerService } from '../queues/queue-producer.service';
import { OrderEventsGateway } from '../events/order-events.gateway';
import { CacheService } from '../cache/cache.service';
import { ProductsService } from '../products/products.service';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly queueProducer: QueueProducerService,
    private readonly orderEventsGateway: OrderEventsGateway,
    private readonly cacheService: CacheService,
    private readonly productsService: ProductsService,
  ) {}

  /**
   * Place Order with Strict Stock Validation & Database Transaction
   */
  async checkout(customerId: string, dto: CreateOrderDto): Promise<Order> {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Đơn hàng phải chứa ít nhất một sản phẩm.');
    }

    const customer = await this.userRepository.findOne({ where: { id: customerId } });
    if (!customer) {
      throw new NotFoundException('Không tìm thấy tài khoản khách hàng đặt hàng.');
    }

    // Run within ACID Database Transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const touchedProductIds: string[] = [];

    try {
      let totalAmount = 0;
      const orderItems: OrderItem[] = [];

      for (const itemDto of dto.items) {
        // Query product with pessimistic write lock to prevent race condition
        const product = await queryRunner.manager.findOne(Product, {
          where: { id: itemDto.productId },
          lock: { mode: 'pessimistic_write' },
        });

        if (!product || !product.isActive) {
          throw new BadRequestException(
            `Sản phẩm với ID ${itemDto.productId} không tồn tại hoặc đã ngừng kinh doanh.`,
          );
        }

        // Strict Stock Validation (F06)
        if (product.stock < itemDto.quantity) {
          throw new BadRequestException(
            `Sản phẩm "${product.name}" (SKU: ${product.sku}) không đủ tồn kho. Tồn hiện tại: ${product.stock}, yêu cầu: ${itemDto.quantity}.`,
          );
        }

        // Deduct inventory
        product.stock -= itemDto.quantity;
        await queryRunner.manager.save(Product, product);
        touchedProductIds.push(product.id);

        const unitPrice = Number(product.price);
        const subtotal = unitPrice * itemDto.quantity;
        totalAmount += subtotal;

        const orderItem = queryRunner.manager.create(OrderItem, {
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          quantity: itemDto.quantity,
          unitPrice,
          subtotal,
        });

        orderItems.push(orderItem);
      }

      // Generate unique Order Number
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const orderNumber = `SF-${dateStr}-${randomSuffix}`;

      const order = queryRunner.manager.create(Order, {
        orderNumber,
        customerId,
        customer,
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.UNPAID,
        totalAmount,
        shippingAddress: dto.shippingAddress,
        contactPhone: dto.contactPhone,
        notes: dto.notes,
        items: orderItems,
      });

      const savedOrder = await queryRunner.manager.save(Order, order);
      await queryRunner.commitTransaction();

      this.logger.log(`Order ${savedOrder.orderNumber} placed successfully. Total: ${totalAmount} VNĐ`);

      // Asynchronous side-effects after successful commit:
      // 1. Invalidate caches for all affected products immediately
      for (const prodId of touchedProductIds) {
        await this.productsService.invalidateProductCache(prodId);
      }

      // 2. Dispatch BullMQ background jobs
      try {
        await this.queueProducer.addOrderConfirmationJob({
          orderId: savedOrder.id,
          orderNumber: savedOrder.orderNumber,
          customerEmail: customer.email,
          customerName: customer.fullName,
          totalAmount: savedOrder.totalAmount,
          items: savedOrder.items,
        });

        await this.queueProducer.addInvoiceJob({
          orderId: savedOrder.id,
          orderNumber: savedOrder.orderNumber,
          customerName: customer.fullName,
          totalAmount: savedOrder.totalAmount,
          items: savedOrder.items,
        });

        for (const item of savedOrder.items) {
          await this.queueProducer.addPartnerSyncJob({
            sku: item.sku,
            stockDelta: -item.quantity,
            source: `order_${savedOrder.orderNumber}`,
          });
        }
      } catch (queueErr: any) {
        this.logger.warn(`Failed to enqueue background jobs for order ${savedOrder.id}: ${queueErr.message}`);
      }

      // 3. Emit real-time tracking update
      this.orderEventsGateway.broadcastOrderStatus(
        savedOrder.id,
        savedOrder.orderNumber,
        savedOrder.status,
        { totalAmount: savedOrder.totalAmount },
      );

      return savedOrder;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(user: { userId: string; role: string }): Promise<Order[]> {
    const isStaff = [Role.ADMIN, Role.AGENT, Role.WAREHOUSE].includes(user.role as Role);

    if (isStaff) {
      return await this.orderRepository.find({
        order: { createdAt: 'DESC' },
        relations: ['customer', 'items'],
      });
    }

    return await this.orderRepository.find({
      where: { customerId: user.userId },
      order: { createdAt: 'DESC' },
      relations: ['items'],
    });
  }

  async findById(id: string, user?: { userId: string; role: string }): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['customer', 'items'],
    });

    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng với ID ${id}`);
    }

    if (user) {
      const isOwner = order.customerId === user.userId;
      const isStaff = [Role.ADMIN, Role.AGENT, Role.WAREHOUSE].includes(user.role as Role);
      if (!isOwner && !isStaff) {
        throw new ForbiddenException('Bạn không có quyền truy cập vào thông tin đơn hàng này.');
      }
    }

    return order;
  }

  async findByOrderNumber(orderNumber: string): Promise<Order | null> {
    return await this.orderRepository.findOne({
      where: { orderNumber },
      relations: ['customer', 'items'],
    });
  }

  async updateStatus(
    id: string,
    dto: UpdateOrderStatusDto,
    user?: { userId: string; role: string },
  ): Promise<Order> {
    const order = await this.findById(id, user);

    const oldStatus = order.status;
    order.status = dto.status;
    if (dto.notes) {
      order.notes = order.notes ? `${order.notes} | ${dto.notes}` : dto.notes;
    }

    const updated = await this.orderRepository.save(order);

    this.logger.log(`Order ${order.orderNumber} status changed: ${oldStatus} -> ${dto.status}`);

    // Broadcast Realtime Event to WebSocket room (F02)
    this.orderEventsGateway.broadcastOrderStatus(
      updated.id,
      updated.orderNumber,
      updated.status,
      { previousStatus: oldStatus, notes: dto.notes },
    );

    return updated;
  }

  async updatePaymentStatus(id: string, dto: UpdatePaymentStatusDto): Promise<Order> {
    const order = await this.findById(id);
    order.paymentStatus = dto.paymentStatus;
    return await this.orderRepository.save(order);
  }
}
