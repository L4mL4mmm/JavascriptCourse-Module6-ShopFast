import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AiAgentService } from './ai-agent.service';
import { TicketsService } from '../tickets/tickets.service';
import { AiChatDto, AiChatResponseDto } from './dto';
import { ConfirmProposalDto } from '../tickets/dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums';
import { Ticket } from '../tickets/entities/ticket.entity';

@ApiTags('AI Support Agent')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('ai-agent')
export class AiAgentController {
  constructor(
    private readonly aiAgentService: AiAgentService,
    private readonly ticketsService: TicketsService,
  ) {}

  @Post('chat')
  @ApiOperation({ summary: 'Trò chuyện với AI Support Agent (Function Calling & HITL)' })
  @ApiResponse({ status: 200, type: AiChatResponseDto })
  async chat(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: AiChatDto,
  ): Promise<AiChatResponseDto> {
    return await this.aiAgentService.chat(user.userId, dto);
  }

  @Roles(Role.ADMIN, Role.AGENT)
  @Get('proposals')
  @ApiOperation({ summary: 'Danh sách các đề xuất AI đang chờ nhân viên duyệt (Human-in-the-Loop)' })
  @ApiResponse({ status: 200, type: [Ticket] })
  async getPendingProposals(): Promise<Ticket[]> {
    return await this.ticketsService.getPendingProposals();
  }

  @Roles(Role.ADMIN, Role.AGENT)
  @Post('proposals/:id/confirm')
  @ApiOperation({ summary: 'Nhân viên CSKH phê duyệt hoặc từ chối đề xuất của AI' })
  @ApiResponse({ status: 200 })
  async confirmProposal(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ConfirmProposalDto,
  ) {
    return await this.ticketsService.confirmProposal(id, user.userId, dto);
  }
}
