import { HttpStatus } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { ThrottlerExceptionFilter } from './throttler-exception.filter';

describe('ThrottlerExceptionFilter', () => {
  let filter: ThrottlerExceptionFilter;

  beforeEach(() => {
    filter = new ThrottlerExceptionFilter();
  });

  it('should return 429 status, Retry-After header, and Vietnamese message', () => {
    const mockJson = jest.fn();
    const mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    const mockHeader = jest.fn();

    const mockHost = {
      switchToHttp: () => ({
        getResponse: () => ({
          header: mockHeader,
          status: mockStatus,
        }),
        getRequest: () => ({
          url: '/api/auth/login',
        }),
      }),
    } as any;

    const exception = new ThrottlerException();
    filter.catch(exception, mockHost);

    expect(mockHeader).toHaveBeenCalledWith('Retry-After', '60');
    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.TOO_MANY_REQUESTS);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 429,
        error: 'Too Many Requests',
        retryAfter: 60,
        message: expect.stringContaining('Bạn đã gửi quá nhiều yêu cầu'),
      }),
    );
  });
});
