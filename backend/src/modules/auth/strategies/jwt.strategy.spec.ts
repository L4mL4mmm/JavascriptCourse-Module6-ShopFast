import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let mockUsersService: any;
  let mockConfigService: any;

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn().mockReturnValue('test_secret'),
    };
    mockUsersService = {
      findById: jest.fn().mockImplementation((id) => {
        if (id === 'u1') {
          return Promise.resolve({
            id: 'u1',
            email: 'a@b.com',
            fullName: 'User A',
            role: 'CUSTOMER',
            isActive: true,
          });
        }
        return Promise.resolve(null);
      }),
    };

    strategy = new JwtStrategy(mockConfigService as any, mockUsersService as any);
  });

  it('should validate and return user payload', async () => {
    const payload = { sub: 'u1', email: 'a@b.com', role: 'CUSTOMER', type: 'access' as const };
    const res = await strategy.validate(payload);
    expect(res.userId).toBe('u1');
    expect(res.email).toBe('a@b.com');
  });

  it('should throw UnauthorizedException if token type is refresh', async () => {
    const payload = { sub: 'u1', email: 'a@b.com', role: 'CUSTOMER', type: 'refresh' as const };
    await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException if user not found or inactive', async () => {
    const payload = { sub: 'non-existent', email: 'a@b.com', role: 'CUSTOMER', type: 'access' as const };
    await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
  });
});
