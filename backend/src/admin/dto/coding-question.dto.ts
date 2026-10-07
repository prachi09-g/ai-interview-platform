import {
  ApiProperty,
  ApiPropertyOptional,
  PartialType,
} from '@nestjs/swagger';
import { Difficulty } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class TestCaseDto {
  @ApiProperty({ example: '2 3' })
  @IsString()
  @MinLength(1)
  input!: string;

  @ApiProperty({ example: '5' })
  @IsString()
  @MinLength(1)
  expectedOutput!: string;
}

export class CreateCodingQuestionDto {
  @ApiProperty()
  @IsUUID()
  categoryId!: string;

  @ApiProperty({ example: 'Add Two Numbers' })
  @IsString()
  @MinLength(3)
  @MaxLength(150)
  title!: string;

  @ApiProperty({
    example: 'Read two integers from input and print their sum.',
  })
  @IsString()
  @MinLength(10)
  @MaxLength(4000)
  description!: string;

  @ApiProperty({ enum: Difficulty })
  @IsEnum(Difficulty)
  difficulty!: Difficulty;

  @ApiProperty({
    type: [TestCaseDto],
    example: [
      {
        input: '2 3',
        expectedOutput: '5',
      },
    ],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => TestCaseDto)
  testCases!: TestCaseDto[];

  @ApiPropertyOptional({
    example: ['javascript', 'python'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  supportedLanguages!: string[];
}

export class UpdateCodingQuestionDto extends PartialType(
  CreateCodingQuestionDto,
) {}