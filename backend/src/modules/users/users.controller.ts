import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserRoleDto, UserResponseDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums';

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Lấy thông tin tài khoản hiện tại' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  async getProfile(@CurrentUser() currentUser: CurrentUserPayload): Promise<UserResponseDto> {
    const user = await this.usersService.findById(currentUser.userId);
    if (!user) {
      throw new NotFoundException('Không tìm thấy thông tin tài khoản.');
    }
    return this.usersService.toResponseDto(user);
  }

  @Get()
  @Roles(Role.ADMIN, Role.AGENT)
  @ApiOperation({ summary: 'Danh sách người dùng (Chỉ ADMIN & AGENT)' })
  @ApiResponse({ status: 200, type: [UserResponseDto] })
  async findAll(): Promise<UserResponseDto[]> {
    return await this.usersService.findAll();
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.AGENT)
  @ApiOperation({ summary: 'Chi tiết người dùng theo ID (Chỉ ADMIN & AGENT)' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  async findOne(@Param('id') id: string): Promise<UserResponseDto> {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException(`Không tìm thấy người dùng với ID ${id}`);
    }
    return this.usersService.toResponseDto(user);
  }

  @Patch(':id/role')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Cập nhật vai trò người dùng (Chỉ ADMIN)' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  async updateRole(
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDto,
  ): Promise<UserResponseDto> {
    return await this.usersService.updateRole(id, dto);
  }
}
