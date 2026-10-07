import { Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { CertificatesService } from './certificates.service';

@ApiTags('Certificates')
@Controller('certificates')
export class CertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  @Public()
  @Get('status')
  @ApiOperation({ summary: 'Module wiring status for the Certificates module' })
  getStatus() {
    return this.certificatesService.getModuleStatus();
  }

  @Get()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: "List the authenticated user's earned certificates" })
  list(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.certificatesService.findAllForUser(currentUser.id);
  }

  @HttpCode(HttpStatus.OK)
  @Post(':id/download')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get the download URL for a certificate' })
  download(@CurrentUser() currentUser: AuthenticatedUser, @Param('id') id: string) {
    return this.certificatesService.getDownloadUrl(currentUser.id, id);
  }
}
