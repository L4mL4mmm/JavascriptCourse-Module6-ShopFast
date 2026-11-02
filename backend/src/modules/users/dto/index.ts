import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { Role } from '../../../common/enums';

export class CreateUserDto {
  @ApiProperty({ example: 'customer@shopfast.vn' })
  @IsEmail({}, { message: 'Email không đúng định dạng.' })
  @IsNotEmpty({ message: 'Email không được để trống.' })
  email: string;

  @ApiProperty({ example: 'SecurePassword123!' })
  @IsString()
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự.' })
  @IsNotEmpty({ message: 'Mật khẩu không được để trống.' })
  password: string;

  @ApiProperty({ example: 'Nguyen Van A' })
  @IsString()
  @IsNotEmpty({ message: 'Họ và tên không được để trống.' })
  fullName: string;

  @ApiProperty({ example: '0901234567', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ enum: Role, default: Role.CUSTOMER, required: false })
  @IsOptional()
  @IsEnum(Role, { message: 'Vai trò người dùng không hợp lệ.' })
  role?: Role;
}

export class UpdateUserRoleDto {
  @ApiProperty({ enum: Role, example: Role.AGENT })
  @IsEnum(Role, { message: 'Vai trò người dùng không hợp lệ.' })
  @IsNotEmpty({ message: 'Vai trò không được để trống.' })
  role: Role;
}

export class UserResponseDto {
  @ApiProperty({ example: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d' })
  id: string;

  @ApiProperty({ example: 'customer@shopfast.vn' })
  email: string;

  @ApiProperty({ example: 'Nguyen Van A' })
  fullName: string;

  @ApiProperty({ example: '0901234567' })
  phone?: string;

  @ApiProperty({ enum: Role, example: Role.CUSTOMER })
  role: Role;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;
}
