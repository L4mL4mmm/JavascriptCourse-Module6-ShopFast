import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { Response } from 'express';
import { CacheService } from '../cache/cache.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly dataSource: DataSource,
    private readonly cacheService: CacheService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Kiểm tra trạng thái sức khỏe hệ thống (Database & Redis)' })
  @ApiResponse({ status: 200, description: 'Hệ thống hoạt động bình thường' })
  @ApiResponse({ status: 503, description: 'Một hoặc nhiều dịch vụ gặp sự cố' })
  async check(@Res() res: Response) {
    let dbStatus = 'down';
    let redisStatus = 'down';
    let isHealthy = true;

    // Check Database connection
    try {
      if (this.dataSource.isInitialized) {
        await this.dataSource.query('SELECT 1');
        dbStatus = 'up';
      }
    } catch (err) {
      dbStatus = 'down';
      isHealthy = false;
    }

    // Check Redis connection
    try {
      const redisClient = this.cacheService.getClient();
      if (redisClient) {
        const ping = await redisClient.ping();
        if (ping === 'PONG') {
          redisStatus = 'up';
        }
      }
    } catch (err) {
      redisStatus = 'down';
      // Note: Redis down might be degraded mode because we have graceful DB fallback
    }

    const statusCode = isHealthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;

    return res.status(statusCode).json({
      status: isHealthy ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      details: {
        database: {
          status: dbStatus,
        },
        redis: {
          status: redisStatus,
          resilienceFallback: redisStatus === 'down',
        },
      },
    });
  }
}
