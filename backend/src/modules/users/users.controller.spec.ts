import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { Role } from '../../common/enums';

describe('UsersController', () => {
  let controller: UsersController;
  let mockUsersService: any;

  beforeEach(() => {
    mockUsersService = {
      findById: jest.fn().mockResolvedValue({ id: 'u1', email: 'a@b.com' }),
      toResponseDto: jest.fn().mockReturnValue({ id: 'u1', email: 'a@b.com' }),
      findAll: jest.fn().mockResolvedValue([{ id: 'u1' }]),
      updateRole: jest.fn().mockResolvedValue({ id: 'u1', role: Role.ADMIN }),
    };

    controller = new UsersController(mockUsersService as UsersService);
  });

  it('should get current profile', async () => {
    const res = await controller.getProfile({ userId: 'u1', email: 'a@b.com', role: 'CUSTOMER' });
    expect(res.id).toBe('u1');
  });

  it('should find all users', async () => {
    const res = await controller.findAll();
    expect(res.length).toBe(1);
  });

  it('should find one user by id', async () => {
    const res = await controller.findOne('u1');
    expect(res.id).toBe('u1');
  });

  it('should update user role', async () => {
    const res = await controller.updateRole('u1', { role: Role.ADMIN });
    expect(res.role).toBe(Role.ADMIN);
  });
});
