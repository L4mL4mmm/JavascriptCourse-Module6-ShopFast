import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@shopfast.vn' })
  @IsEmail({}, { message: 'Email không đúng định dạng.' })
  @IsNotEmpty({ message: 'Email không được để trống.' })
  email: string;

  @ApiProperty({ example: 'AdminPass123!' })
  @IsString()
  @IsNotEmpty({ message: 'Mật khẩu không được để trống.' })
  password: string;
}

export class RegisterDto {
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
}

export class RefreshTokenDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsIn...' })
  @IsString()
  @IsNotEmpty({ message: 'Refresh token không được để trống.' })
  refreshToken: string;
}

export class SendOtpDto {
  @ApiProperty({ example: 'customer@shopfast.vn' })
  @IsEmail({}, { message: 'Email không đúng định dạng.' })
  @IsNotEmpty({ message: 'Email không được để trống.' })
  email: string;
}

export class AuthResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;

  @ApiProperty({ example: 'Bearer' })
  tokenType: string;

  @ApiProperty({ example: 900 })
  expiresIn: number;

  @ApiProperty()
  user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
  };
}
