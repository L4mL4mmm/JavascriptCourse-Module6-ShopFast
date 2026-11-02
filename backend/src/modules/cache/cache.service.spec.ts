import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CacheService, NULL_CACHE_SENTINEL } from './cache.service';

describe('CacheService', () => {
  let service: CacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
  });

  it('should gracefully fallback to fetchFn when Redis is not available', async () => {
    const mockDbFetch = jest.fn().mockResolvedValue({ id: 'from-db', data: 123 });
    const result = await service.getOrSetWithLock('test-key', mockDbFetch);

    expect(result).toEqual({ id: 'from-db', data: 123 });
    expect(mockDbFetch).toHaveBeenCalledTimes(1);
  });

  it('should return null when cache hit is NULL_CACHE_SENTINEL', async () => {
    jest.spyOn(service, 'isAvailable').mockReturnValue(true);
    jest.spyOn(service, 'get').mockResolvedValue(NULL_CACHE_SENTINEL as any);

    const mockDbFetch = jest.fn();
    const result = await service.getOrSetWithLock('non-existent-key', mockDbFetch);

    expect(result).toBeNull();
    expect(mockDbFetch).not.toHaveBeenCalled();
  });

  it('should return cached object without querying database on cache hit', async () => {
    jest.spyOn(service, 'isAvailable').mockReturnValue(true);
    jest.spyOn(service, 'get').mockResolvedValue({ sku: 'IPHONE-15', stock: 10 } as any);

    const mockDbFetch = jest.fn();
    const result = await service.getOrSetWithLock('product:sku:IPHONE-15', mockDbFetch);

    expect(result).toEqual({ sku: 'IPHONE-15', stock: 10 });
    expect(mockDbFetch).not.toHaveBeenCalled();
  });
});
