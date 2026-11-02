import { CustomThrottlerGuard } from './custom-throttler.guard';

describe('CustomThrottlerGuard', () => {
  let guard: CustomThrottlerGuard;

  beforeEach(() => {
    guard = new CustomThrottlerGuard(
      { throttlers: [] } as any,
      {} as any,
      {} as any,
    );
  });

  it('should use userId when user is authenticated', async () => {
    const req = {
      user: { userId: 'usr-1234' },
      ip: '192.168.1.1',
    };

    const tracker = await (guard as any).getTracker(req);
    expect(tracker).toBe('user_usr-1234');
  });

  it('should fallback to x-forwarded-for IP when unauthenticated', async () => {
    const req = {
      headers: { 'x-forwarded-for': '203.0.113.195, 70.41.3.18' },
      ip: '10.0.0.1',
    };

    const tracker = await (guard as any).getTracker(req);
    expect(tracker).toBe('ip_203.0.113.195');
  });

  it('should fallback to req.ip when unauthenticated and no forwarded header', async () => {
    const req = {
      ip: '127.0.0.1',
    };

    const tracker = await (guard as any).getTracker(req);
    expect(tracker).toBe('ip_127.0.0.1');
  });
});
