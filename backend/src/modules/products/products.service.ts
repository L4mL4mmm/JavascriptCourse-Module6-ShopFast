import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, EntityManager, FindOptionsWhere, ILike, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { CreateProductDto, QueryProductDto, UpdateProductDto } from './dto';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly cacheService: CacheService,
  ) {}

  async create(dto: CreateProductDto): Promise<Product> {
    const existingSku = await this.productRepository.findOne({
      where: { sku: dto.sku.toUpperCase() },
    });
    if (existingSku) {
      throw new ConflictException(`SKU ${dto.sku} đã tồn tại trong hệ thống.`);
    }

    const product = this.productRepository.create({
      ...dto,
      sku: dto.sku.toUpperCase(),
      price: Number(dto.price),
      stock: Number(dto.stock),
      isActive: true,
    });

    const saved = await this.productRepository.save(product);

    // Invalidate list caches immediately
    await this.cacheService.delByPattern('products:list:*');

    return saved;
  }

  async findAll(query: QueryProductDto): Promise<{ items: Product[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const cacheKey = `products:list:${JSON.stringify({
      page,
      limit,
      category: query.category,
      search: query.search,
      minPrice: query.minPrice,
      maxPrice: query.maxPrice,
    })}`;

    // Use High-Performance Cache with Mutex Stampede Lock & Null Caching
    return await this.cacheService.getOrSetWithLock(
      cacheKey,
      async () => {
        const where: FindOptionsWhere<Product> = { isActive: true };

        if (query.category) {
          where.category = query.category;
        }

        if (query.search) {
          where.name = ILike(`%${query.search}%`);
        }

        if (query.minPrice !== undefined && query.maxPrice !== undefined) {
          where.price = Between(query.minPrice, query.maxPrice) as any;
        } else if (query.minPrice !== undefined) {
          where.price = MoreThanOrEqual(query.minPrice) as any;
        } else if (query.maxPrice !== undefined) {
          where.price = LessThanOrEqual(query.maxPrice) as any;
        }

        const [items, total] = await this.productRepository.findAndCount({
          where,
          order: { createdAt: 'DESC' },
          skip,
          take: limit,
        });

        return { items, total, page, limit };
      },
      300, // 5 min TTL for product lists
      60,  // 1 min for empty/null lists
    );
  }

  async findById(id: string): Promise<Product> {
    const cacheKey = `product:id:${id}`;

    const product = await this.cacheService.getOrSetWithLock<Product | null>(
      cacheKey,
      async () => {
        const found = await this.productRepository.findOne({ where: { id } });
        return found || null;
      },
      600, // 10 min TTL for individual product
      60,  // 1 min Null caching to prevent cache penetration
    );

    if (!product) {
      throw new NotFoundException(`Không tìm thấy sản phẩm với ID ${id}`);
    }

    return product;
  }

  async findBySku(sku: string): Promise<Product | null> {
    const cleanSku = sku.trim().toUpperCase();
    const cacheKey = `product:sku:${cleanSku}`;

    return await this.cacheService.getOrSetWithLock<Product | null>(
      cacheKey,
      async () => {
        const found = await this.productRepository.findOne({ where: { sku: cleanSku } });
        return found || null;
      },
      600,
      60,
    );
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.findById(id);

    if (dto.sku && dto.sku.toUpperCase() !== product.sku) {
      const existingSku = await this.productRepository.findOne({
        where: { sku: dto.sku.toUpperCase() },
      });
      if (existingSku && existingSku.id !== id) {
        throw new ConflictException(`SKU ${dto.sku} đã tồn tại ở sản phẩm khác.`);
      }
      product.sku = dto.sku.toUpperCase();
    }

    if (dto.name !== undefined) product.name = dto.name;
    if (dto.description !== undefined) product.description = dto.description;
    if (dto.price !== undefined) product.price = Number(dto.price);
    if (dto.stock !== undefined) product.stock = Number(dto.stock);
    if (dto.category !== undefined) product.category = dto.category;
    if (dto.imageUrl !== undefined) product.imageUrl = dto.imageUrl;
    if (dto.isActive !== undefined) product.isActive = dto.isActive;

    const saved = await this.productRepository.save(product);

    // Immediate Cache Invalidation (F04)
    await this.invalidateProductCache(saved.id, saved.sku);

    return saved;
  }

  async remove(id: string): Promise<{ success: boolean; message: string }> {
    const product = await this.findById(id);
    product.isActive = false;
    await this.productRepository.save(product);

    // Immediate Cache Invalidation
    await this.invalidateProductCache(id, product.sku);

    return { success: true, message: `Sản phẩm ${product.name} đã được ngừng kinh doanh.` };
  }

  /**
   * Helper to invalidate all relevant cache keys on price or inventory update
   */
  async invalidateProductCache(id: string, sku?: string): Promise<void> {
    const keysToDel = [`product:id:${id}`];
    if (sku) {
      keysToDel.push(`product:sku:${sku}`);
    }

    for (const key of keysToDel) {
      await this.cacheService.del(key);
    }

    // Invalidate all list caches
    await this.cacheService.delByPattern('products:list:*');
    this.logger.log(`[Cache Invalidation] Flushed cache for Product ID: ${id}, SKU: ${sku}`);
  }
}
