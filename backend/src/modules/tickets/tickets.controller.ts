import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TicketsService } from './tickets.service';
import { ConfirmProposalDto, CreateTicketDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums';
import { Ticket } from './entities/ticket.entity';

@ApiTags('Tickets & Support')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  @ApiOperation({ summary: 'Khách hàng tạo yêu cầu hỗ trợ mới' })
  @ApiResponse({ status: 201, type: Ticket })
  async createTicket(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateTicketDto,
  ): Promise<Ticket> {
    return await this.ticketsService.createTicket(user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách yêu cầu hỗ trợ' })
  @ApiResponse({ status: 200, type: [Ticket] })
  async findAll(@CurrentUser() user: CurrentUserPayload): Promise<Ticket[]> {
    return await this.ticketsService.findAll(user);
  }

  @Roles(Role.ADMIN, Role.AGENT)
  @Get('proposals/pending')
  @ApiOperation({ summary: 'Danh sách đề xuất AI chờ nhân viên phê duyệt (Human-in-the-Loop)' })
  @ApiResponse({ status: 200, type: [Ticket] })
  async getPendingProposals(): Promise<Ticket[]> {
    return await this.ticketsService.getPendingProposals();
  }

  @Roles(Role.ADMIN, Role.AGENT)
  @Post('proposals/:id/confirm')
  @ApiOperation({ summary: 'Nhân viên phê duyệt hoặc từ chối đề xuất của AI (Thực thi thay đổi trạng thái)' })
  @ApiResponse({ status: 200 })
  async confirmProposal(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ConfirmProposalDto,
  ) {
    return await this.ticketsService.confirmProposal(id, user.userId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết ticket hoặc proposal' })
  @ApiResponse({ status: 200, type: Ticket })
  async findOne(@Param('id') id: string): Promise<Ticket> {
    return await this.ticketsService.findById(id);
  }
}
