import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AnalyzeResumeDto {
  @ApiPropertyOptional({
    example: 'Backend Engineer',
    description: 'The role to tailor missing-skills detection and suggestions toward. Falls back to the profile\'s targetRole if omitted.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  targetJobRole?: string;
}
