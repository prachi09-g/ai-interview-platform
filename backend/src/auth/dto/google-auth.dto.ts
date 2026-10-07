import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class GoogleAuthDto {
  @ApiProperty({
    description: 'The one-time authorization code returned by Google Identity Services to the frontend',
  })
  @IsString()
  code!: string;
}
