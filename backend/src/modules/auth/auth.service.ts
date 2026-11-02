import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { CacheService } from '../cache/cache.service';
import { AuthResponseDto, LoginDto, RefreshTokenDto, RegisterDto, SendOtpDto } from './dto';
import { User } from '../users/entities/user.entity';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const user = await this.usersService.create(dto);
    return this.generateTokens(user);
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác.');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Tài khoản đã bị tạm khóa.');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác.');
    }

    return this.generateTokens(user);
  }

  async refreshToken(dto: RefreshTokenDto): Promise<AuthResponseDto> {
    try {
      const refreshSecret = this.configService.get<string>('jwt.refreshSecret');
      const payload = this.jwtService.verify<JwtPayload>(dto.refreshToken, {
        secret: refreshSecret,
      });

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Loại token không hợp lệ.');
      }

      const user = await this.usersService.findById(payload.sub);
      if (!user || !user.isActive) {
        throw new UnauthorizedException('Người dùng không hợp lệ hoặc đã bị khóa.');
      }

      return this.generateTokens(user);
    } catch (err: any) {
      throw new UnauthorizedException('Refresh token đã hết hạn hoặc không hợp lệ.');
    }
  }

  async sendOtp(dto: SendOtpDto): Promise<{ message: string; otpExpiresInSeconds: number }> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      // Don't reveal account existence, pretend OTP sent for security
      return {
        message: 'Mã OTP đã được gửi đến email của bạn nếu tài khoản tồn tại.',
        otpExpiresInSeconds: 300,
      };
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpKey = `otp:${dto.email.toLowerCase()}`;

    // Store in cache for 5 minutes (300 seconds)
    await this.cacheService.set(otpKey, { otp, attempts: 0 }, 300);

    this.logger.log(`[OTP GENERATED] Email: ${dto.email} -> OTP: ${otp} (Valid for 5 mins)`);

    return {
      message: `Mã OTP đã được gửi thành công đến ${dto.email}. (Demo OTP: ${otp})`,
      otpExpiresInSeconds: 300,
    };
  }

  private generateTokens(user: User): AuthResponseDto {
    const accessPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      type: 'access',
    };

    const refreshPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      type: 'refresh',
    };

    const accessSecret = this.configService.get<string>('jwt.accessSecret');
    const refreshSecret = this.configService.get<string>('jwt.refreshSecret');
    const accessExpiration = this.configService.get<string>('jwt.accessExpiration', '15m');
    const refreshExpiration = this.configService.get<string>('jwt.refreshExpiration', '7d');

    const accessToken = this.jwtService.sign(accessPayload, {
      secret: accessSecret,
      expiresIn: accessExpiration,
    });

    const refreshToken = this.jwtService.sign(refreshPayload, {
      secret: refreshSecret,
      expiresIn: refreshExpiration,
    });

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: 900, // 15 mins in seconds
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    };
  }
}
