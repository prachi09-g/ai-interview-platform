import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';
import { AdminCategoriesController } from './admin-categories.controller';
import { AdminCategoriesService } from './admin-categories.service';
import { AdminQuestionsController } from './admin-questions.controller';
import { AdminQuestionsService } from './admin-questions.service';
import { AdminCodingQuestionsController } from './admin-coding-questions.controller';
import { AdminCodingQuestionsService } from './admin-coding-questions.service';
import { AdminSkillsController } from './admin-skills.controller';
import { AdminSkillsService } from './admin-skills.service';
import { AdminFeedbackController } from './admin-feedback.controller';
import { AdminFeedbackService } from './admin-feedback.service';
import { AdminResumeTemplatesController } from './admin-resume-templates.controller';
import { AdminResumeTemplatesService } from './admin-resume-templates.service';
import { AdminLogsController } from './admin-logs.controller';
import { AdminNotificationsController } from './admin-notifications.controller';
import { AdminOverviewController } from './admin-overview.controller';
import { AdminOverviewService } from './admin-overview.service';

@Module({
  // SystemLogsService (used by AdminLogsController) lives in the global
  // LoggingModule (imported once in AppModule), not here — see
  // src/logging/system-logs.service.ts for why.
  imports: [NotificationsModule],
  controllers: [
    AdminController,
    AdminUsersController,
    AdminCategoriesController,
    AdminQuestionsController,
    AdminCodingQuestionsController,
    AdminSkillsController,
    AdminFeedbackController,
    AdminResumeTemplatesController,
    AdminLogsController,
    AdminNotificationsController,
    AdminOverviewController,
  ],
  providers: [
    AdminService,
    AdminUsersService,
    AdminCategoriesService,
    AdminQuestionsService,
    AdminCodingQuestionsService,
    AdminSkillsService,
    AdminFeedbackService,
    AdminResumeTemplatesService,
    AdminOverviewService,
  ],
})
export class AdminModule {}
