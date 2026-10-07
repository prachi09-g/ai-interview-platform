import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CertificatesService {
  constructor(private readonly prisma: PrismaService) {}

  getModuleStatus() {
    return {
      module: 'certificates',
      status: 'initialized',
      implementedIn:
        'Phase 6 (read + download API) — certificate generation on domain mastery is computed in Phase 12 (Analytics)',
    };
  }

  findAllForUser(userId: string) {
    return this.prisma.certificate.findMany({
      where: { userId },
      include: { category: true },
      orderBy: { issuedAt: 'desc' },
    });
  }

  /**
   * Returns the stored file URL for a certificate the user owns. The file
   * itself is generated and uploaded to object storage by the Analytics
   * module (Phase 12) when a domain-mastery threshold is met — this just
   * serves the reference, matching the POST /certificates/:id/download
   * contract from the Phase 1 API design.
   */
  async getDownloadUrl(userId: string, certificateId: string): Promise<{ url: string }> {
    const certificate = await this.prisma.certificate.findUnique({ where: { id: certificateId } });

    if (!certificate) {
      throw new NotFoundException('Certificate not found');
    }
    if (certificate.userId !== userId) {
      throw new ForbiddenException('This certificate does not belong to you');
    }

    return { url: certificate.fileUrl };
  }
}
