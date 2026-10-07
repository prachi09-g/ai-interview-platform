import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AchievementsService } from '../achievements/achievements.service';
import { ResumeParserService } from './resume-parser.service';
import { AtsScorerService } from './ats-scorer.service';
import { ResumeAiService } from './resume-ai.service';

const MAX_RESUME_SIZE_BYTES = 5 * 1024 * 1024; // 5MB, matches Settings.MAX_RESUME_SIZE_MB seeded in Phase 3
const HIGH_ATS_SCORE_THRESHOLD = 80; // matches the HIGH_ATS_SCORE badge description in Phase 6's catalog

@Injectable()
export class ResumeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly resumeParserService: ResumeParserService,
    private readonly atsScorerService: AtsScorerService,
    private readonly resumeAiService: ResumeAiService,
    private readonly notificationsService: NotificationsService,
    private readonly achievementsService: AchievementsService,
  ) {}

  getModuleStatus() {
    return {
      module: 'resume',
      status: 'initialized',
      implementedIn: 'Phase 8 (Resume Analyzer)',
    };
  }

  async upload(userId: string, file: Express.Multer.File) {
    if (file.mimetype !== 'application/pdf') {
      throw new ForbiddenException('Only PDF files are accepted');
    }
    if (file.size > MAX_RESUME_SIZE_BYTES) {
      throw new ForbiddenException('Resume file exceeds the 5MB size limit');
    }

    const { fileUrl } = await this.storageService.uploadFile(file.buffer, file.originalname, 'resumes');

    const resume = await this.prisma.resume.create({
      data: {
        userId,
        fileUrl,
        originalName: file.originalname,
      },
    });

    await this.achievementsService.awardBadge(userId, 'RESUME_UPLOADED');
    await this.notificationsService.createForUser(
      userId,
      'Resume uploaded',
      `${file.originalname} is ready to analyze — run an ATS check to see your score and suggestions.`,
    );

    return resume;
  }

  findAllForUser(userId: string) {
    return this.prisma.resume.findMany({
      where: { userId },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  listTemplates() {
    return this.prisma.resumeTemplate.findMany({ orderBy: { createdAt: 'desc' } });
  }

  private async findOwnedResume(userId: string, resumeId: string) {
    const resume = await this.prisma.resume.findUnique({ where: { id: resumeId } });
    if (!resume) throw new NotFoundException('Resume not found');
    if (resume.userId !== userId) throw new ForbiddenException('This resume does not belong to you');
    return resume;
  }

  async getAnalysis(userId: string, resumeId: string) {
    await this.findOwnedResume(userId, resumeId);
    const analysis = await this.prisma.resumeAnalysis.findUnique({
      where: { resumeId },
      include: { atsReport: true },
    });
    if (!analysis) {
      throw new NotFoundException('This resume has not been analyzed yet — call POST /resume/:id/analyze first');
    }
    return analysis;
  }

  async getAtsReport(userId: string, resumeId: string) {
    const analysis = await this.getAnalysis(userId, resumeId);
    if (!analysis.atsReport) {
      throw new NotFoundException('ATS report not found for this resume');
    }
    return analysis.atsReport;
  }

  /**
   * The core Phase 8 pipeline: fetch the stored PDF -> extract text and
   * detect sections/skills (ResumeParserService) -> compute a deterministic
   * ATS score (AtsScorerService) -> generate missing-skills + suggestions
   * (ResumeAiService, real LLM call or heuristic fallback) -> persist
   * ResumeAnalysis + AtsReport (upserted, so re-analyzing replaces the
   * previous result rather than accumulating duplicates).
   *
   * Runs synchronously within the request rather than through the
   * RESUME_ANALYSIS BullMQ queue (wired in Phase 2 for exactly this kind
   * of AI-latency work). Deliberate scope trade-off: PDF parsing + a
   * single LLM call typically completes in a few seconds, and the
   * heuristic fallback (no API key configured) is near-instant — both are
   * within a reasonable HTTP timeout. Moving this behind the queue (job
   * status polling, a WebSocket/poll-based frontend UX) is a reasonable
   * follow-up if resume volume or LLM latency grows, and the queue
   * infrastructure is already there to support it; Phase 9's interview
   * evaluation pipeline (transcription + multiple chained AI calls per
   * question) is where async processing earns its complexity now.
   */
  async analyze(userId: string, resumeId: string, targetJobRoleOverride: string | undefined) {
    const resume = await this.findOwnedResume(userId, resumeId);

    const fileBuffer = await this.readResumeFile(resume.fileUrl);

    const [allSkills, profile] = await Promise.all([
      this.prisma.skill.findMany({ select: { name: true } }),
      this.prisma.profile.findUnique({ where: { userId } }),
    ]);
    const allSkillNames = allSkills.map((s) => s.name);
    const targetJobRole = targetJobRoleOverride ?? profile?.targetRole ?? undefined;

    const parsed = await this.resumeParserService.parse(fileBuffer, allSkillNames);
    const { atsScore, sectionScores } = this.atsScorerService.score(parsed, allSkillNames.length);
    const { missingSkills, suggestions } = await this.resumeAiService.generateSuggestions(
      parsed,
      targetJobRole,
      allSkillNames,
    );

    // Persist the matched skills onto the Resume's own skill relation too,
    // so a student's ATS-matched skills feed into resume-based skill
    // search/filtering elsewhere without re-parsing the PDF.
    await this.prisma.resume.update({
      where: { id: resumeId },
      data: {
        parsedData: {
          wordCount: parsed.wordCount,
          sections: parsed.sections,
          emails: parsed.emails,
        } as unknown as Prisma.InputJsonValue,
        skills: {
          set: [],
          connectOrCreate: parsed.matchedSkillNames.map((name) => ({ where: { name }, create: { name } })),
        },
      },
    });

    const analysis = await this.prisma.resumeAnalysis.upsert({
      where: { resumeId },
      create: {
        resumeId,
        missingSkills: missingSkills as unknown as Prisma.InputJsonValue,
        suggestions: suggestions as unknown as Prisma.InputJsonValue,
        targetJobRole,
        atsReport: {
          create: { atsScore, sectionScores: sectionScores as unknown as Prisma.InputJsonValue },
        },
      },
      update: {
        missingSkills: missingSkills as unknown as Prisma.InputJsonValue,
        suggestions: suggestions as unknown as Prisma.InputJsonValue,
        targetJobRole,
        atsReport: {
          upsert: {
            create: { atsScore, sectionScores: sectionScores as unknown as Prisma.InputJsonValue },
            update: { atsScore, sectionScores: sectionScores as unknown as Prisma.InputJsonValue },
          },
        },
      },
      include: { atsReport: true },
    });

    await this.notificationsService.createForUser(
      userId,
      'Resume analysis ready',
      `Your ATS score is ${atsScore}/100. ${suggestions.length} suggestion(s) available to improve it.`,
    );
    if (atsScore >= HIGH_ATS_SCORE_THRESHOLD) {
      await this.achievementsService.awardBadge(userId, 'HIGH_ATS_SCORE');
    }

    return analysis;
  }

  async remove(userId: string, resumeId: string) {
    const resume = await this.findOwnedResume(userId, resumeId);
    await this.storageService.deleteFile(resume.fileUrl);
    await this.prisma.resume.delete({ where: { id: resumeId } });
    return { message: 'Resume deleted' };
  }

  /**
   * Reads the resume file back from wherever StorageService put it — local
   * disk (dev fallback) or a real S3-compatible URL — so analyze() can pass
   * raw bytes to the PDF parser without the parser needing to know which
   * backend stored it.
   */
  private async readResumeFile(fileUrl: string): Promise<Buffer> {
    if (fileUrl.startsWith('/uploads/')) {
      const fs = await import('fs/promises');
      const path = await import('path');
      const fullPath = path.resolve(process.cwd(), fileUrl.replace(/^\//, ''));
      return fs.readFile(fullPath);
    }

    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new NotFoundException('Could not retrieve the stored resume file');
    }
    return Buffer.from(await response.arrayBuffer());
  }
}
