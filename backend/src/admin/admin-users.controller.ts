import { Body, Controller, Delete, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { AdminUsersService } from './admin-users.service';
import { AdminUpdateUserDto } from './dto/update-user.dto';
import { AdminListQueryDto } from './dto/list-query.dto';

@ApiTags('Admin')
@ApiBearerAuth('access-token')
@Roles(RoleName.ADMIN)
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Get()
  @ApiOperation({ summary: '[Admin] List all users' })
  findAll(@Query() query: AdminListQueryDto) {
    return this.adminUsersService.findAll(query.search, query.page ?? 1, query.limit ?? 20);
  }

  @Get(':id')
  @ApiOperation({ summary: '[Admin] Get a single user' })
  findOne(@Param('id') id: string) {
    return this.adminUsersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '[Admin] Activate/deactivate a user or override email verification' })
  update(@Param('id') id: string, @Body() dto: AdminUpdateUserDto, @CurrentUser() admin: AuthenticatedUser) {
    return this.adminUsersService.update(id, dto, admin.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: '[Admin] Deactivate a user (soft delete)' })
  remove(@Param('id') id: string, @CurrentUser() admin: AuthenticatedUser) {
    return this.adminUsersService.remove(id, admin.id);
  }
}
