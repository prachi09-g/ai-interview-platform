import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { AdminService } from './admin.service';

@ApiTags('Admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Public()
  @Get('status')
  @ApiOperation({ summary: 'Module wiring status for the Admin module' })
  getStatus() {
    return this.adminService.getModuleStatus();
  }
}
