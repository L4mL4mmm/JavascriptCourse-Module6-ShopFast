import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus, PaymentStatus } from '../../../common/enums';

export class OrderItemDto {
  @ApiProperty({ example: '8f7d9a3b-1234-4567-8901-abcdef123456' })
  @IsUUID('4', { message: 'productId phải là UUID hợp lệ.' })
  @IsNotEmpty({ message: 'productId không được để trống.' })
  productId: string;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt({ message: 'Số lượng phải là số nguyên.' })
  @Min(1, { message: 'Số lượng phải lớn hơn hoặc bằng 1.' })
  quantity: number;
}

export class CreateOrderDto {
  @ApiProperty({ type: [OrderItemDto] })
  @IsArray({ message: 'Danh sách sản phẩm items phải là mảng.' })
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiProperty({ example: '123 Nguyen Hue, Quan 1, TP. Ho Chi Minh' })
  @IsString()
  @IsNotEmpty({ message: 'Địa chỉ nhận hàng không được để trống.' })
  shippingAddress: string;

  @ApiProperty({ example: '0909888999' })
  @IsString()
  @IsNotEmpty({ message: 'Số điện thoại liên hệ không được để trống.' })
  contactPhone: string;

  @ApiProperty({ example: 'Giao giờ hành chính', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: OrderStatus, example: OrderStatus.CONFIRMED })
  @IsEnum(OrderStatus, { message: 'Trạng thái đơn hàng không hợp lệ.' })
  status: OrderStatus;

  @ApiProperty({ example: 'Đơn hàng đã được xác nhận và đóng gói', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdatePaymentStatusDto {
  @ApiProperty({ enum: PaymentStatus, example: PaymentStatus.PAID })
  @IsEnum(PaymentStatus, { message: 'Trạng thái thanh toán không hợp lệ.' })
  paymentStatus: PaymentStatus;
}
