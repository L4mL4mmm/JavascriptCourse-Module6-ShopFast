import { ThrottlerStorageRedisService } from './throttler-storage-redis.service';

describe('ThrottlerStorageRedisService', () => {
  let service: ThrottlerStorageRedisService;

  beforeEach(() => {
    service = new ThrottlerStorageRedisService();
  });

  afterEach(() => {
    service.onModuleDestroy();
  });

  it('should increment using memory fallback when Redis is offline', async () => {
    const key = 'test_key_throttle';
    const rec1 = await service.increment(key, 60000);
    expect(rec1.totalHits).toBe(1);
    expect(rec1.timeToExpire).toBe(60);

    const rec2 = await service.increment(key, 60000);
    expect(rec2.totalHits).toBe(2);
  });
});
