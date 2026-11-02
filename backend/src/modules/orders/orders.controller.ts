import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { OrdersService } from './orders.service';
import { CreateOrderDto, UpdateOrderStatusDto, UpdatePaymentStatusDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums';
import { Order } from './entities/order.entity';

@ApiTags('Orders')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('checkout')
  @ApiOperation({ summary: 'Đặt hàng & thanh toán (Giới hạn: 5 req/phút, xác thực tồn kho ACID)' })
  @ApiResponse({ status: 201, type: Order })
  async checkout(
    @CurrentUser() user: CurrentUserPayload,
    @Body() createOrderDto: CreateOrderDto,
  ): Promise<Order> {
    return await this.ordersService.checkout(user.userId, createOrderDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách đơn hàng (Khách hàng xem đơn của mình, Nhân viên xem tất cả)' })
  @ApiResponse({ status: 200, type: [Order] })
  async findAll(@CurrentUser() user: CurrentUserPayload): Promise<Order[]> {
    return await this.ordersService.findAll(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết đơn hàng theo ID' })
  @ApiResponse({ status: 200, type: Order })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<Order> {
    return await this.ordersService.findById(id, user);
  }

  @Roles(Role.ADMIN, Role.AGENT, Role.WAREHOUSE)
  @Patch(':id/status')
  @ApiOperation({ summary: 'Cập nhật trạng thái đơn hàng (Tự động phát WebSocket Realtime)' })
  @ApiResponse({ status: 200, type: Order })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<Order> {
    return await this.ordersService.updateStatus(id, dto, user);
  }

  @Roles(Role.ADMIN, Role.AGENT)
  @Patch(':id/payment')
  @ApiOperation({ summary: 'Cập nhật trạng thái thanh toán đơn hàng (Chỉ ADMIN & AGENT)' })
  @ApiResponse({ status: 200, type: Order })
  async updatePayment(
    @Param('id') id: string,
    @Body() dto: UpdatePaymentStatusDto,
  ): Promise<Order> {
    return await this.ordersService.updatePaymentStatus(id, dto);
  }
}
