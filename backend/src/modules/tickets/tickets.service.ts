import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket } from './entities/ticket.entity';
import { Order } from '../orders/entities/order.entity';
import { Product } from '../products/entities/product.entity';
import { ConfirmProposalDto, CreateTicketDto } from './dto';
import { ProposalStatus, TicketStatus, OrderStatus, Role } from '../../common/enums';
import { OrderEventsGateway } from '../events/order-events.gateway';
import { ProductsService } from '../products/products.service';

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);

  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly orderEventsGateway: OrderEventsGateway,
    private readonly productsService: ProductsService,
  ) {}

  async createTicket(customerId: string, dto: CreateTicketDto): Promise<Ticket> {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const ticketNumber = `TCK-${Date.now().toString().slice(-6)}-${randomSuffix}`;

    const ticket = this.ticketRepository.create({
      ticketNumber,
      customerId,
      title: dto.title,
      description: dto.description,
      orderId: dto.orderId,
      status: TicketStatus.OPEN,
      proposalStatus: ProposalStatus.PENDING,
    });

    return await this.ticketRepository.save(ticket);
  }

  /**
   * AI Agent generates a state-changing proposal requiring human approval (HITL)
   */
  async createProposal(
    customerId: string,
    title: string,
    description: string,
    proposedAction: string,
    actionPayload: Record<string, any>,
    orderId?: string,
  ): Promise<Ticket> {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const ticketNumber = `PROP-${Date.now().toString().slice(-6)}-${randomSuffix}`;

    const proposal = this.ticketRepository.create({
      ticketNumber,
      customerId,
      title,
      description,
      orderId,
      proposedAction,
      actionPayload,
      status: TicketStatus.PENDING_CONFIRMATION,
      proposalStatus: ProposalStatus.PENDING,
    });

    const saved = await this.ticketRepository.save(proposal);
    this.logger.log(`[HITL Proposal Generated] #${saved.ticketNumber} - Action: ${proposedAction} for Order ${orderId}`);
    return saved;
  }

  async getPendingProposals(): Promise<Ticket[]> {
    return await this.ticketRepository.find({
      where: {
        status: TicketStatus.PENDING_CONFIRMATION,
        proposalStatus: ProposalStatus.PENDING,
      },
      relations: ['customer', 'assignedAgent'],
      order: { createdAt: 'DESC' },
    });
  }

  async findAll(user: { userId: string; role: string }): Promise<Ticket[]> {
    const isStaff = [Role.ADMIN, Role.AGENT].includes(user.role as Role);
    if (isStaff) {
      return await this.ticketRepository.find({
        relations: ['customer', 'assignedAgent'],
        order: { createdAt: 'DESC' },
      });
    }

    return await this.ticketRepository.find({
      where: { customerId: user.userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<Ticket> {
    const ticket = await this.ticketRepository.findOne({
      where: { id },
      relations: ['customer', 'assignedAgent'],
    });

    if (!ticket) {
      throw new NotFoundException(`Không tìm thấy ticket/proposal với ID ${id}`);
    }

    return ticket;
  }

  /**
   * Human Agent Confirms or Rejects the AI Proposal (HITL execution)
   */
  async confirmProposal(
    proposalId: string,
    agentId: string,
    dto: ConfirmProposalDto,
  ): Promise<{ ticket: Ticket; executed: boolean; message: string }> {
    const ticket = await this.findById(proposalId);

    if (ticket.proposalStatus !== ProposalStatus.PENDING) {
      throw new BadRequestException(`Yêu cầu đề xuất này đã được xử lý trước đó với trạng thái ${ticket.proposalStatus}`);
    }

    ticket.assignedAgentId = agentId;
    ticket.resolutionNotes = dto.notes;

    if (dto.decision === 'REJECT') {
      ticket.proposalStatus = ProposalStatus.REJECTED;
      ticket.status = TicketStatus.CLOSED;
      const saved = await this.ticketRepository.save(ticket);
      return {
        ticket: saved,
        executed: false,
        message: 'Đề xuất đã bị từ chối bởi nhân viên hỗ trợ.',
      };
    }

    // Decision === APPROVE -> Execute State-Changing Operation!
    ticket.proposalStatus = ProposalStatus.APPROVED;
    ticket.status = TicketStatus.RESOLVED;

    let executionMessage = 'Đề xuất đã được duyệt và thực thi thành công.';

    if (ticket.proposedAction === 'CANCEL_ORDER' && ticket.orderId) {
      const order = await this.orderRepository.findOne({
        where: { id: ticket.orderId },
        relations: ['items'],
      });

      if (order) {
        order.status = OrderStatus.CANCELLED;
        await this.orderRepository.save(order);

        // Restore stock
        if (order.items) {
          for (const item of order.items) {
            const product = await this.productRepository.findOne({ where: { id: item.productId } });
            if (product) {
              product.stock += item.quantity;
              await this.productRepository.save(product);
              await this.productsService.invalidateProductCache(product.id, product.sku);
            }
          }
        }

        // Broadcast to WebSocket
        this.orderEventsGateway.broadcastOrderStatus(
          order.id,
          order.orderNumber,
          OrderStatus.CANCELLED,
          { reason: 'Approved cancellation by Human Agent' },
        );

        executionMessage = `Đơn hàng #${order.orderNumber} đã được hủy thành công và hoàn trả số lượng tồn kho.`;
      }
    } else if (ticket.proposedAction === 'UPDATE_SHIPPING_ADDRESS' && ticket.orderId && ticket.actionPayload?.newAddress) {
      const order = await this.orderRepository.findOne({ where: { id: ticket.orderId } });
      if (order) {
        order.shippingAddress = ticket.actionPayload.newAddress;
        await this.orderRepository.save(order);
        executionMessage = `Địa chỉ nhận hàng của đơn hàng #${order.orderNumber} đã được cập nhật thành: ${ticket.actionPayload.newAddress}`;
      }
    }

    const saved = await this.ticketRepository.save(ticket);
    return {
      ticket: saved,
      executed: true,
      message: executionMessage,
    };
  }
}
