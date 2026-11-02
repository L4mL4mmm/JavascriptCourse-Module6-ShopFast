import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { Product } from './entities/product.entity';
import { CacheService } from '../cache/cache.service';

describe('ProductsService', () => {
  let service: ProductsService;
  let mockRepo: any;
  let mockCacheService: any;

  const mockProduct = {
    id: 'prod-1',
    sku: 'IPHONE-15-PRO-256',
    name: 'iPhone 15 Pro Max',
    price: 29990000,
    stock: 50,
    category: 'Smartphones',
    isActive: true,
  };

  beforeEach(async () => {
    mockRepo = {
      findOne: jest.fn().mockImplementation(({ where }) => {
        if (where.id === mockProduct.id || where.sku === mockProduct.sku) {
          return Promise.resolve({ ...mockProduct });
        }
        return Promise.resolve(null);
      }),
      findAndCount: jest.fn().mockResolvedValue([[mockProduct], 1]),
      create: jest.fn().mockImplementation((d) => ({ id: 'new-p', ...d })),
      save: jest.fn().mockImplementation((p) => Promise.resolve(p)),
    };

    mockCacheService = {
      getOrSetWithLock: jest.fn().mockImplementation((key, fetchFn) => fetchFn()),
      del: jest.fn().mockResolvedValue(undefined),
      delByPattern: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: getRepositoryToken(Product), useValue: mockRepo },
        { provide: CacheService, useValue: mockCacheService },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  it('should find product by id using getOrSetWithLock cache', async () => {
    const prod = await service.findById(mockProduct.id);
    expect(prod.sku).toBe(mockProduct.sku);
    expect(mockCacheService.getOrSetWithLock).toHaveBeenCalled();
  });

  it('should throw NotFoundException if product is not found', async () => {
    await expect(service.findById('non-existent-id')).rejects.toThrow(NotFoundException);
  });

  it('should update product and trigger cache invalidation immediately', async () => {
    const updated = await service.update(mockProduct.id, { price: 28990000 });
    expect(updated.price).toBe(28990000);
    expect(mockCacheService.del).toHaveBeenCalledWith(`product:id:${mockProduct.id}`);
    expect(mockCacheService.delByPattern).toHaveBeenCalledWith('products:list:*');
  });

  it('should find products with pagination using cache', async () => {
    const res = await service.findAll({ page: 1, limit: 10 });
    expect(res.items.length).toBe(1);
    expect(res.total).toBe(1);
    expect(mockCacheService.getOrSetWithLock).toHaveBeenCalled();
  });
});
