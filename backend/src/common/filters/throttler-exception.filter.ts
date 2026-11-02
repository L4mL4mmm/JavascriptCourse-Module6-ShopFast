import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { Response, Request } from 'express';

@Catch(ThrottlerException)
export class ThrottlerExceptionFilter implements ExceptionFilter {
  catch(exception: ThrottlerException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Standard rate limit window is 60 seconds unless configured otherwise
    const retryAfterSeconds = 60;

    response.header('Retry-After', retryAfterSeconds.toString());

    response.status(HttpStatus.TOO_MANY_REQUESTS).json({
      statusCode: HttpStatus.TOO_MANY_REQUESTS,
      error: 'Too Many Requests',
      message: `Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau ${retryAfterSeconds} giây.`,
      retryAfter: retryAfterSeconds,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
