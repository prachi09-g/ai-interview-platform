import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import { NotificationsModule } from '../notifications/notifications.module';
import { AchievementsModule } from '../achievements/achievements.module';

import { ResumeController } from './resume.controller';
import { ResumeService } from './resume.service';
import { ResumeParserService } from './resume-parser.service';
import { AtsScorerService } from './ats-scorer.service';
import { ResumeAiService } from './resume-ai.service';

@Module({
  imports: [
    MulterModule.register({
      storage: memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    }),
    NotificationsModule,
    AchievementsModule,
  ],
  controllers: [ResumeController],
  providers: [
    ResumeService,
    ResumeParserService,
    AtsScorerService,
    ResumeAiService,
  ],
  exports: [ResumeService],
})
export class ResumeModule {}