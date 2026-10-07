import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateFeedbackDto {
  @ApiProperty({ example: 'Bug: OTP email not arriving' })
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  subject!: string;

  @ApiProperty({ example: 'I registered 10 minutes ago and still haven\'t received the verification email.' })
  @IsString()
  @MinLength(2)
  @MaxLength(2000)
  message!: string;
}
