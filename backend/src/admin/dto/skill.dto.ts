import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateSkillDto {
  @ApiProperty({ example: 'Kubernetes' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ example: 'DevOps' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;
}

export class UpdateSkillDto extends PartialType(CreateSkillDto) {}
