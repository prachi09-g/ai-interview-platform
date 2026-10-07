import { ApiProperty } from '@nestjs/swagger';
import { Difficulty, InterviewType } from '@prisma/client';
import { IsEnum, IsIn, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

/**
 * Only TECHNICAL/HR/BEHAVIORAL are accepted here. CODING interviews run
 * through the Coding Assessment module (Phase 11); VOICE interviews need
 * the Speech Analysis pipeline (Phase 10) to turn audio into a transcript
 * before this module's text-based evaluation can run. Accepting those
 * values now and having them silently behave like a text interview would
 * be misleading — this DTO won't accept them until those phases wire in
 * their piece of the flow.
 */
const SUPPORTED_TYPES = [InterviewType.TECHNICAL, InterviewType.HR, InterviewType.BEHAVIORAL] as const;

export class CreateInterviewDto {
  @ApiProperty()
  @IsUUID()
  categoryId!: string;

  @ApiProperty({ enum: SUPPORTED_TYPES, description: 'CODING and VOICE are not yet supported by this endpoint' })
  @IsIn(SUPPORTED_TYPES)
  type!: InterviewType;

  @ApiProperty({ enum: Difficulty })
  @IsEnum(Difficulty)
  difficulty!: Difficulty;

  @ApiProperty({ required: false, description: 'Defaults to the platform-wide Setting DEFAULT_INTERVIEW_QUESTION_COUNT' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  questionCount?: number;
}
