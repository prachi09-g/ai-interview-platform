import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class TranscribeAudioDto {
  @ApiProperty({ description: 'The InterviewResponse this recording answers (pre-allocated when the session was created)' })
  @IsUUID()
  responseId!: string;

  @ApiProperty({ description: 'Clip length in seconds, measured client-side (MediaRecorder/Audio element)' })
  @Type(() => Number)
  @IsNumber()
  @Min(0.5)
  @Max(600)
  durationSeconds!: number;

  @ApiPropertyOptional({
    description:
      'Pre-transcribed text if the frontend already used browser-native speech-to-text (Web Speech API). ' +
      'When provided, server-side Whisper transcription is skipped — but pronunciationScore and pauseCount ' +
      'cannot be computed without Whisper\'s segment data, so those come back null.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(8000)
  transcript?: string;
}
