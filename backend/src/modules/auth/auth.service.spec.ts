import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { CacheService } from '../cache/cache.service';
import { Role } from '../../common/enums';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: Partial<UsersService>;
  let jwtService: Partial<JwtService>;
  let cacheService: Partial<CacheService>;

  const mockUser = {
    id: 'user-1',
    email: 'customer@shopfast.vn',
    passwordHash: '$2a$10$hashedpassword',
    fullName: 'Nguyen Van Customer',
    role: Role.CUSTOMER,
    isActive: true,
  };

  beforeEach(async () => {
    usersService = {
      create: jest.fn().mockResolvedValue(mockUser),
      findByEmail: jest.fn().mockImplementation(async (email) => {
        return email === mockUser.email ? (mockUser as any) : null;
      }),
      findById: jest.fn().mockImplementation(async (id) => {
        return id === mockUser.id ? (mockUser as any) : null;
      }),
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('mock_signed_token'),
      verify: jest.fn().mockReturnValue({ sub: mockUser.id, type: 'refresh' }),
    };

    cacheService = {
      set: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: CacheService, useValue: cacheService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key, defaultVal) => defaultVal || 'test_secret'),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should register a new user and return tokens', async () => {
    const res = await service.register({
      email: 'new@shopfast.vn',
      password: 'password123',
      fullName: 'New User',
    });

    expect(usersService.create).toHaveBeenCalled();
    expect(res.accessToken).toBe('mock_signed_token');
    expect(res.refreshToken).toBe('mock_signed_token');
    expect(res.user.email).toBe(mockUser.email);
  });

  it('should login successfully with valid credentials', async () => {
    jest.spyOn(bcrypt, 'compare').mockImplementation(async () => true);

    const res = await service.login({
      email: mockUser.email,
      password: 'correct_password',
    });

    expect(res.accessToken).toBe('mock_signed_token');
    expect(res.user.id).toBe(mockUser.id);
  });

  it('should throw UnauthorizedException on invalid password', async () => {
    jest.spyOn(bcrypt, 'compare').mockImplementation(async () => false);

    await expect(
      service.login({
        email: mockUser.email,
        password: 'wrong_password',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException if user not found', async () => {
    await expect(
      service.login({
        email: 'nonexistent@shopfast.vn',
        password: 'any_password',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should refresh tokens successfully', async () => {
    const res = await service.refreshToken({ refreshToken: 'valid_refresh_token' });
    expect(res.accessToken).toBe('mock_signed_token');
    expect(res.user.id).toBe(mockUser.id);
  });

  it('should send OTP and store in cache', async () => {
    const res = await service.sendOtp({ email: mockUser.email });
    expect(res.otpExpiresInSeconds).toBe(300);
    expect(cacheService.set).toHaveBeenCalled();
  });
});
