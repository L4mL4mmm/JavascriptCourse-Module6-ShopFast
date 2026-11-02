import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { RedisIoAdapter } from './modules/events/redis-io.adapter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port', 3000);

  // Enable CORS
  app.enableCors({
    origin: '*',
    credentials: true,
  });

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // Global API Prefix (except health & admin dashboard)
  app.setGlobalPrefix('api', {
    exclude: ['health', 'admin/queues', 'admin/queues/(.*)'],
  });

  // Setup Redis Pub/Sub WebSocket Adapter (F02)
  const redisHost = configService.get<string>('redis.host', 'localhost');
  const redisPort = configService.get<number>('redis.port', 6379);
  const redisPassword = configService.get<string>('redis.password', undefined);

  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis(redisHost, redisPort, redisPassword);
  app.useWebSocketAdapter(redisIoAdapter);

  // Automated Swagger OpenAPI Documentation at /api/docs (F07)
  const swaggerConfig = new DocumentBuilder()
    .setTitle('ShopFast E-Commerce API')
    .setDescription(
      'Production-grade High-Performance E-Commerce Backend with Clean Architecture, Redis Caching, BullMQ Queues, Realtime WebSockets, and AI Support Agent',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Nhập JWT Access Token để xác thực',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Auth', 'Xác thực, đăng ký, đăng nhập và OTP')
    .addTag('Users', 'Quản lý thông tin tài khoản và vai trò')
    .addTag('Products', 'Quản lý sản phẩm, tồn kho và danh mục')
    .addTag('Orders', 'Đặt hàng, xác thực tồn kho và theo dõi đơn')
    .addTag('Tickets & Support', 'Yêu cầu hỗ trợ & phê duyệt đề xuất (HITL)')
    .addTag('AI Support Agent', 'Trợ lý AI CSKH với Function Calling')
    .addTag('Health', 'Kiểm tra trạng thái hệ thống')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  // Graceful shutdown hooks
  app.enableShutdownHooks();

  await app.listen(port);
  logger.log(`=======================================================`);
  logger.log(` ShopFast Backend is running on: http://localhost:${port}`);
  logger.log(` Swagger OpenAPI Docs: http://localhost:${port}/api/docs`);
  logger.log(` Health Endpoint: http://localhost:${port}/health`);
  logger.log(` BullMQ Dashboard: http://localhost:${port}/admin/queues`);
  logger.log(`=======================================================`);
}

bootstrap();
