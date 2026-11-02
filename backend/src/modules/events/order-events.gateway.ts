import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../orders/entities/order.entity';
import { Role, OrderStatus } from '../../common/enums';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class OrderEventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(OrderEventsGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}

  /**
   * Handshake authentication using JWT token
   */
  async handleConnection(client: Socket) {
    try {
      const authHeader =
        client.handshake.auth?.token ||
        client.handshake.headers['authorization'] ||
        client.handshake.query?.token;

      if (!authHeader) {
        this.logger.warn(`Socket connection rejected: No token provided (${client.id})`);
        client.disconnect();
        return;
      }

      const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : authHeader;

      const accessSecret = this.configService.get<string>('jwt.accessSecret');
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: accessSecret,
      });

      // Attach authenticated user info to socket instance
      client.data.user = {
        userId: payload.sub,
        email: payload.email,
        role: payload.role,
      };

      this.logger.log(`Socket connected: ${client.id} - User: ${payload.email} (${payload.role})`);
      client.emit('connected', {
        message: 'Kết nối WebSocket thành công đến ShopFast Realtime Gateway',
        userId: payload.sub,
      });
    } catch (err: any) {
      this.logger.warn(`Socket authentication failed: ${err.message} (${client.id})`);
      client.emit('error', { message: 'Token không hợp lệ hoặc đã hết hạn.' });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Socket disconnected: ${client.id}`);
  }

  /**
   * Dynamic Room Join: Subscribe to order updates (restricted to order owner or ADMIN/AGENT)
   */
  @SubscribeMessage('subscribe_order')
  async handleSubscribeOrder(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: string },
  ) {
    const user = client.data.user;
    if (!user) {
      client.emit('error', { message: 'Yêu cầu đăng nhập trước khi đăng ký theo dõi đơn hàng.' });
      return;
    }

    if (!data || !data.orderId) {
      client.emit('error', { message: 'Mã đơn hàng orderId không được để trống.' });
      return;
    }

    const order = await this.orderRepository.findOne({
      where: { id: data.orderId },
      relations: ['items'],
    });

    if (!order) {
      client.emit('error', { message: `Không tìm thấy đơn hàng với ID ${data.orderId}` });
      return;
    }

    // Authorization check: Only order owner or ADMIN/AGENT/WAREHOUSE can join
    const isOwner = order.customerId === user.userId;
    const isStaff = [Role.ADMIN, Role.AGENT, Role.WAREHOUSE].includes(user.role as Role);

    if (!isOwner && !isStaff) {
      this.logger.warn(`Unauthorized room join attempt for order ${data.orderId} by user ${user.userId}`);
      client.emit('error', { message: 'Bạn không có quyền theo dõi đơn hàng này.' });
      return;
    }

    const roomName = `order:${data.orderId}`;
    await client.join(roomName);

    this.logger.log(`Client ${client.id} joined room ${roomName}`);

    // Immediately send current order state (handles auto-reconnect & state re-sync)
    client.emit('order_subscribed', {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      totalAmount: order.totalAmount,
      shippingAddress: order.shippingAddress,
      updatedAt: order.updatedAt,
      items: order.items?.map((item) => ({
        productName: item.productName,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal,
      })),
    });
  }

  /**
   * Unsubscribe from order room
   */
  @SubscribeMessage('unsubscribe_order')
  async handleUnsubscribeOrder(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: string },
  ) {
    if (data?.orderId) {
      const roomName = `order:${data.orderId}`;
      await client.leave(roomName);
      client.emit('order_unsubscribed', { orderId: data.orderId });
    }
  }

  /**
   * Broadcast status update to all connected clients in the order room
   */
  broadcastOrderStatus(
    orderId: string,
    orderNumber: string,
    newStatus: OrderStatus,
    metadata?: Record<string, any>,
  ) {
    const roomName = `order:${orderId}`;
    const payload = {
      orderId,
      orderNumber,
      status: newStatus,
      timestamp: new Date().toISOString(),
      ...metadata,
    };

    this.logger.log(`[WebSocket Broadcast] Emitting status '${newStatus}' to room ${roomName}`);
    this.server.to(roomName).emit('order_status_updated', payload);
  }
}
