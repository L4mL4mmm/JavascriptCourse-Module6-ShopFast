import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { Role } from '../../common/enums';

describe('UsersService', () => {
  let service: UsersService;
  let mockRepo: any;

  beforeEach(async () => {
    mockRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn().mockImplementation((dto) => ({ id: 'u-1', ...dto })),
      save: jest.fn().mockImplementation((user) => Promise.resolve(user)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should create a new user when email is unique', async () => {
    mockRepo.findOne.mockResolvedValue(null);
    const user = await service.create({
      email: 'test@shopfast.vn',
      password: 'password123',
      fullName: 'Test User',
    });

    expect(user.email).toBe('test@shopfast.vn');
    expect(mockRepo.save).toHaveBeenCalled();
  });

  it('should throw ConflictException when email is already registered', async () => {
    mockRepo.findOne.mockResolvedValue({ id: 'existing' });

    await expect(
      service.create({
        email: 'test@shopfast.vn',
        password: 'password123',
        fullName: 'Test User',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('should update user role', async () => {
    mockRepo.findOne.mockResolvedValue({ id: 'u-1', email: 'agent@shopfast.vn', role: Role.CUSTOMER });
    const res = await service.updateRole('u-1', { role: Role.AGENT });
    expect(res.role).toBe(Role.AGENT);
  });

  it('should throw NotFoundException when updating non-existent user', async () => {
    mockRepo.findOne.mockResolvedValue(null);
    await expect(service.updateRole('non-existent', { role: Role.AGENT })).rejects.toThrow(NotFoundException);
  });
});
