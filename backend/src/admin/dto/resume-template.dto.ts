import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateResumeTemplateDto {
  @ApiProperty({ example: 'Minimalist Two-Column' })
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name!: string;

  @ApiPropertyOptional({ example: 'Clean ATS-friendly layout, best for technical roles.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ example: 'Software Development' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;
}

export class UpdateResumeTemplateDto {
  @ApiPropertyOptional({ example: 'Minimalist Two-Column' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional({ example: 'Clean ATS-friendly layout, best for technical roles.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ example: 'Software Development' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;
}
