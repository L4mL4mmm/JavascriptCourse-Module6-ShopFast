import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Requirement F03: User ID if authenticated, IP if unauthenticated
    if (req.user && (req.user.userId || req.user.id)) {
      return `user_${req.user.userId || req.user.id}`;
    }

    const forwarded = req.headers?.['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
      return `ip_${forwarded.split(',')[0].trim()}`;
    }

    return `ip_${req.ip || req.socket?.remoteAddress || '127.0.0.1'}`;
  }
}
