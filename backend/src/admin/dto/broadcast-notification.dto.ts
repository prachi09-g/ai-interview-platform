import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class BroadcastNotificationDto {
  @ApiProperty({ example: 'Scheduled maintenance tonight' })
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  title!: string;

  @ApiProperty({ example: 'The platform will be briefly unavailable at 2 AM UTC for maintenance.' })
  @IsString()
  @MinLength(2)
  @MaxLength(1000)
  message!: string;
}
