import { ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Jane Doe' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/avatars/jane.png' })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  avatarUrl?: string;

  @ApiPropertyOptional({ example: 'Backend Engineer' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  targetRole?: string;

  @ApiPropertyOptional({ example: '0-1 years' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  experienceLevel?: string;

  @ApiPropertyOptional({ example: 'CS student focused on backend systems and distributed databases.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  bio?: string;

  @ApiPropertyOptional({
    example: ['TypeScript', 'PostgreSQL', 'System Design'],
    description: 'Replaces the profile\'s full skill list. Unknown skill names are created on the fly.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  skills?: string[];
}
