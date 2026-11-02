import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;
  let mockDataSource: any;
  let mockCacheService: any;
  let mockRes: any;

  beforeEach(() => {
    mockDataSource = {
      isInitialized: true,
      query: jest.fn().mockResolvedValue([{ 1: 1 }]),
    };
    mockCacheService = {
      getClient: jest.fn().mockReturnValue({ ping: jest.fn().mockResolvedValue('PONG') }),
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockImplementation((data) => data),
    };

    controller = new HealthController(mockDataSource, mockCacheService);
  });

  it('should return 200 ok when DB and Redis are up', async () => {
    await controller.check(mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'ok',
        details: {
          database: { status: 'up' },
          redis: { status: 'up', resilienceFallback: false },
        },
      }),
    );
  });

  it('should return 503 when DB query fails', async () => {
    mockDataSource.query.mockRejectedValue(new Error('DB down'));
    await controller.check(mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(503);
  });
});
