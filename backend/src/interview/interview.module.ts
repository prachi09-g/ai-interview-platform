import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NotificationsModule } from '../notifications/notifications.module';
import { AchievementsModule } from '../achievements/achievements.module';
import { QUEUE_NAMES } from '../queue/queue.constants';
import { InterviewController } from './interview.controller';
import { InterviewService } from './interview.service';
import { QuestionGeneratorService } from './ai/question-generator.service';
import { AnswerEvaluatorService } from './ai/answer-evaluator.service';
import { InterviewEvaluationProcessor } from './processors/interview-evaluation.processor';

@Module({
  imports: [
    NotificationsModule,
    AchievementsModule,
    // The queue is already registered globally in QueueModule (Phase 2), but
    // @nestjs/bullmq's @Processor()/WorkerHost pattern expects the queue to
    // also be registered within the module that provides the processor —
    // this re-registration is idempotent, not a duplicate queue.
    BullModule.registerQueue({ name: QUEUE_NAMES.INTERVIEW_EVALUATION }),
  ],
  controllers: [InterviewController],
  providers: [InterviewService, QuestionGeneratorService, AnswerEvaluatorService, InterviewEvaluationProcessor],
  exports: [InterviewService],
})
export class InterviewModule {}
