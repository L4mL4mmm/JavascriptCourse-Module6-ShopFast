import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

describe('ProductsController', () => {
  let controller: ProductsController;
  let mockProductsService: any;

  beforeEach(() => {
    mockProductsService = {
      findAll: jest.fn().mockResolvedValue({ items: [], total: 0 }),
      findById: jest.fn().mockResolvedValue({ id: 'p1', sku: 'SKU1' }),
      findBySku: jest.fn().mockResolvedValue({ id: 'p1', sku: 'SKU1' }),
      create: jest.fn().mockResolvedValue({ id: 'p1', sku: 'SKU1' }),
      update: jest.fn().mockResolvedValue({ id: 'p1', price: 100 }),
      remove: jest.fn().mockResolvedValue({ success: true }),
    };

    controller = new ProductsController(mockProductsService as ProductsService);
  });

  it('should find all products', async () => {
    const res = await controller.findAll({ page: 1, limit: 10 });
    expect(res.total).toBe(0);
  });

  it('should find by id', async () => {
    const res = await controller.findOne('p1');
    expect(res.sku).toBe('SKU1');
  });

  it('should find by sku', async () => {
    const res = await controller.findBySku('SKU1');
    expect(res.sku).toBe('SKU1');
  });

  it('should create product', async () => {
    const res = await controller.create({ sku: 'SKU1', name: 'P1', price: 100, stock: 10, category: 'C' });
    expect(res.sku).toBe('SKU1');
  });

  it('should update product', async () => {
    const res = await controller.update('p1', { price: 200 });
    expect(res.price).toBe(100);
  });

  it('should remove product', async () => {
    const res = await controller.remove('p1');
    expect(res.success).toBe(true);
  });
});
