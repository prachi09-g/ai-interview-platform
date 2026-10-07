import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum } from 'class-validator';

export enum ResendOtpPurpose {
  VERIFY_EMAIL = 'VERIFY_EMAIL',
  RESET_PASSWORD = 'RESET_PASSWORD',
}

export class ResendOtpDto {
  @ApiProperty({ example: 'jane.doe@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ enum: ResendOtpPurpose, example: ResendOtpPurpose.VERIFY_EMAIL })
  @IsEnum(ResendOtpPurpose)
  purpose!: ResendOtpPurpose;
}
