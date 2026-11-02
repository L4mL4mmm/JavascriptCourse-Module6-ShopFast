import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let mockAuthService: any;

  beforeEach(() => {
    mockAuthService = {
      register: jest.fn().mockResolvedValue({ accessToken: 'tok1' }),
      login: jest.fn().mockResolvedValue({ accessToken: 'tok2' }),
      refreshToken: jest.fn().mockResolvedValue({ accessToken: 'tok3' }),
      sendOtp: jest.fn().mockResolvedValue({ message: 'sent' }),
    };

    controller = new AuthController(mockAuthService as AuthService);
  });

  it('should call register', async () => {
    const res = await controller.register({ email: 'a@b.com', password: '123', fullName: 'A' });
    expect(res.accessToken).toBe('tok1');
  });

  it('should call login', async () => {
    const res = await controller.login({ email: 'a@b.com', password: '123' });
    expect(res.accessToken).toBe('tok2');
  });

  it('should call refreshToken', async () => {
    const res = await controller.refreshToken({ refreshToken: 'ref' });
    expect(res.accessToken).toBe('tok3');
  });

  it('should call sendOtp', async () => {
    const res = await controller.sendOtp({ email: 'a@b.com' });
    expect(res.message).toBe('sent');
  });

  it('should return current user in me()', async () => {
    const user = { userId: 'u1', email: 'a@b.com', role: 'CUSTOMER' } as any;
    const res = await controller.me(user);
    expect(res.userId).toBe('u1');
  });
});
