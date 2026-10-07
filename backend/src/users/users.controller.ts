import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Public()
  @Get('status')
  @ApiOperation({ summary: 'Module wiring status for the Users module' })
  getStatus() {
    return {
      module: 'users',
      status: 'initialized',
      implementedIn: 'Phase 3 (Prisma models) + Phase 4 (Auth) + Phase 6 (Profile management)',
    };
  }

  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: "Get the authenticated user's own profile" })
  async getMe(@CurrentUser() currentUser: AuthenticatedUser) {
    const user = await this.usersService.findByIdWithProfile(currentUser.id);
    if (!user) {
      return null;
    }
    const { passwordHash: _passwordHash, ...safeUser } = user;
    return safeUser;
  }

  @Patch('me/profile')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: "Update the authenticated user's profile" })
  async updateProfile(@CurrentUser() currentUser: AuthenticatedUser, @Body() dto: UpdateProfileDto) {
    const user = await this.usersService.updateProfile(currentUser.id, dto);
    const { passwordHash: _passwordHash, ...safeUser } = user;
    return safeUser;
  }

  @Delete('me')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Deactivate the authenticated account (soft delete)' })
  async deleteMe(@CurrentUser() currentUser: AuthenticatedUser) {
    await this.usersService.deactivate(currentUser.id);
    return { message: 'Account deactivated' };
  }
}
