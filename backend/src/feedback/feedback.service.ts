import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';

/**
 * Student-facing feedback submission. Not part of the original Phase 1
 * module list, but a small, necessary addition: the Admin Dashboard's
 * "Feedback Management" screen (Phase 7) needs a way for the Feedback
 * table to actually receive rows, the same way Phase 6 wired real
 * notifications rather than leaving that table permanently empty.
 */
@Injectable()
export class FeedbackService {
  constructor(private readonly prisma: PrismaService) {}

  getModuleStatus() {
    return { module: 'feedback', status: 'initialized', implementedIn: 'Phase 7 (Admin Dashboard)' };
  }

  create(userId: string, dto: CreateFeedbackDto) {
    return this.prisma.feedback.create({ data: { userId, ...dto } });
  }

  findAllForUser(userId: string) {
    return this.prisma.feedback.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }
}
