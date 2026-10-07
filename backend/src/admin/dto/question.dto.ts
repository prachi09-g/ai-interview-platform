import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Difficulty, QuestionType } from '@prisma/client';
import { ArrayMaxSize, IsArray, IsEnum, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateQuestionDto {
  @ApiProperty()
  @IsUUID()
  categoryId!: string;

  @ApiProperty({ enum: QuestionType })
  @IsEnum(QuestionType)
  type!: QuestionType;

  @ApiProperty({ enum: Difficulty })
  @IsEnum(Difficulty)
  difficulty!: Difficulty;

  @ApiProperty({ example: 'Explain the difference between REST and GraphQL.' })
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  questionText!: string;

  @ApiProperty({ example: 'REST uses fixed endpoints per resource; GraphQL exposes a single endpoint...' })
  @IsString()
  @MinLength(10)
  @MaxLength(4000)
  modelAnswer!: string;

  @ApiPropertyOptional({ example: ['REST', 'GraphQL', 'endpoint', 'over-fetching'] })
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  keywords!: string[];
}

export class UpdateQuestionDto extends PartialType(CreateQuestionDto) {}
