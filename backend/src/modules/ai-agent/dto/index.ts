import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AiChatDto {
  @ApiProperty({ example: 'Kiểm tra giúp tôi tồn kho của mã IPHONE-15-PRO-256' })
  @IsString()
  @IsNotEmpty({ message: 'Nội dung tin nhắn không được để trống.' })
  message: string;

  @ApiProperty({ example: 'conv-12345', required: false })
  @IsString()
  @IsOptional()
  conversationId?: string;
}

export class AiToolCallResult {
  toolName: string;
  args: Record<string, any>;
  result: any;
}

export class AiChatResponseDto {
  @ApiProperty()
  reply: string;

  @ApiProperty({ required: false })
  toolCalls?: AiToolCallResult[];

  @ApiProperty({ required: false })
  proposalCreated?: boolean;

  @ApiProperty({ required: false })
  proposal?: {
    id: string;
    ticketNumber: string;
    proposedAction: string;
    status: string;
  };
}
