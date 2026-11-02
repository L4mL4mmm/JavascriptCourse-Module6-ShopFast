import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto, QueryProductDto, UpdateProductDto } from './dto';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums';
import { Product } from './entities/product.entity';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Lấy danh sách sản phẩm (Có phân trang, lọc & Redis Caching)' })
  @ApiResponse({ status: 200, description: 'Danh sách sản phẩm' })
  async findAll(@Query() query: QueryProductDto) {
    return await this.productsService.findAll(query);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết sản phẩm theo ID (Có Mutex Stampede & Null Caching)' })
  @ApiResponse({ status: 200, type: Product })
  async findOne(@Param('id') id: string): Promise<Product> {
    return await this.productsService.findById(id);
  }

  @Public()
  @Get('sku/:sku')
  @ApiOperation({ summary: 'Kiểm tra tồn kho và thông tin sản phẩm theo mã SKU' })
  @ApiResponse({ status: 200, type: Product })
  async findBySku(@Param('sku') sku: string): Promise<Product> {
    return await this.productsService.findBySku(sku);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.WAREHOUSE)
  @ApiBearerAuth('JWT-auth')
  @Post()
  @ApiOperation({ summary: 'Tạo sản phẩm mới (ADMIN, WAREHOUSE)' })
  @ApiResponse({ status: 201, type: Product })
  async create(@Body() createProductDto: CreateProductDto): Promise<Product> {
    return await this.productsService.create(createProductDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.WAREHOUSE)
  @ApiBearerAuth('JWT-auth')
  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật giá hoặc tồn kho (Tự động xóa Cache ngay lập tức)' })
  @ApiResponse({ status: 200, type: Product })
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ): Promise<Product> {
    return await this.productsService.update(id, updateProductDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @Delete(':id')
  @ApiOperation({ summary: 'Ngừng kinh doanh sản phẩm (Chỉ ADMIN)' })
  @ApiResponse({ status: 200 })
  async remove(@Param('id') id: string) {
    return await this.productsService.remove(id);
  }
}
