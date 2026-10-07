import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class SubmitCodeDto {
  @ApiProperty({ example: 'javascript' })
  @IsString()
  language!: string;

  @ApiProperty({ example: 'function twoSum(nums, target) { /* ... */ }' })
  @IsString()
  @MinLength(1)
  @MaxLength(20000)
  code!: string;
}
