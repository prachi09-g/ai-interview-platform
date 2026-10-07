import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class SubmitResponseDto {
  @ApiProperty()
  @IsUUID()
  questionId!: string;

  @ApiProperty({ example: 'REST exposes fixed resource endpoints, while GraphQL exposes a single endpoint...' })
  @IsString()
  @MinLength(1)
  @MaxLength(8000)
  transcript!: string;
}
