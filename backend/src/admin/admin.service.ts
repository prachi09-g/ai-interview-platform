import { Injectable } from '@nestjs/common';

@Injectable()
export class AdminService {
  getModuleStatus() {
    return {
      module: 'admin',
      status: 'initialized',
      implementedIn: 'Phase 7 (Admin Dashboard)',
    };
  }
}
