import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @ApiProperty({ example: 'IPHONE-15-PRO-256' })
  @IsString()
  @IsNotEmpty({ message: 'SKU không được để trống.' })
  sku: string;

  @ApiProperty({ example: 'iPhone 15 Pro Max 256GB' })
  @IsString()
  @IsNotEmpty({ message: 'Tên sản phẩm không được để trống.' })
  name: string;

  @ApiProperty({ example: 'Điện thoại thông minh cao cấp chip A17 Pro titan tự nhiên' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 29990000 })
  @Type(() => Number)
  @IsNumber({}, { message: 'Giá sản phẩm phải là số hợp lệ.' })
  @IsPositive({ message: 'Giá sản phẩm phải lớn hơn 0.' })
  price: number;

  @ApiProperty({ example: 100 })
  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'Số lượng tồn kho không được âm.' })
  stock: number;

  @ApiProperty({ example: 'Smartphones' })
  @IsString()
  @IsNotEmpty({ message: 'Danh mục sản phẩm không được để trống.' })
  category: string;

  @ApiProperty({ example: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9', required: false })
  @IsString()
  @IsOptional()
  imageUrl?: string;
}

export class UpdateProductDto extends PartialType(CreateProductDto) {
  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class QueryProductDto {
  @ApiProperty({ example: 1, required: false })
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @ApiProperty({ example: 10, required: false })
  @Type(() => Number)
  @IsOptional()
  limit?: number = 10;

  @ApiProperty({ example: 'Smartphones', required: false })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({ example: 'iPhone', required: false })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiProperty({ required: false })
  @Type(() => Number)
  @IsOptional()
  minPrice?: number;

  @ApiProperty({ required: false })
  @Type(() => Number)
  @IsOptional()
  maxPrice?: number;
}
