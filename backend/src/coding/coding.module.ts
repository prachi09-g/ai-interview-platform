import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '../queue/queue.constants';
import { AchievementsModule } from '../achievements/achievements.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CodingController } from './coding.controller';
import { CodingService } from './coding.service';
import { Judge0ClientService } from './ai/judge0-client.service';
import { CodingExecutionProcessor } from './processors/coding-execution.processor';

@Module({
  imports: [
    // Re-registered here per the same @Processor()/WorkerHost requirement
    // explained in interview.module.ts.
    BullModule.registerQueue({ name: QUEUE_NAMES.CODING_EXECUTION }),
    AchievementsModule,
    NotificationsModule,
  ],
  controllers: [CodingController],
  providers: [CodingService, Judge0ClientService, CodingExecutionProcessor],
  exports: [CodingService],
})
export class CodingModule {}
