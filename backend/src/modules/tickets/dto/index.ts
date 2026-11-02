import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { ProposalStatus, TicketStatus } from '../../../common/enums';

export class CreateTicketDto {
  @ApiProperty({ example: 'Hỗ trợ thay đổi địa chỉ nhận hàng' })
  @IsString()
  @IsNotEmpty({ message: 'Tiêu đề không được để trống.' })
  title: string;

  @ApiProperty({ example: 'Tôi muốn đổi địa chỉ giao hàng sang 456 Le Loi, Q1' })
  @IsString()
  @IsNotEmpty({ message: 'Nội dung không được để trống.' })
  description: string;

  @ApiProperty({ example: '8f7d9a3b-1234-4567-8901-abcdef123456', required: false })
  @IsUUID('4')
  @IsOptional()
  orderId?: string;
}

export class ConfirmProposalDto {
  @ApiProperty({ enum: ['APPROVE', 'REJECT'], example: 'APPROVE' })
  @IsEnum(['APPROVE', 'REJECT'], { message: 'Quyết định phê duyệt phải là APPROVE hoặc REJECT' })
  decision: 'APPROVE' | 'REJECT';

  @ApiProperty({ example: 'Đã xác nhận với khách qua điện thoại và đồng ý hủy đơn', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}
