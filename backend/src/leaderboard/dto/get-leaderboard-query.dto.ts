import { ApiPropertyOptional } from '@nestjs/swagger';
import { LeaderboardPeriod } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

export class GetLeaderboardQueryDto {
  @ApiPropertyOptional({ description: 'Filter to a single interview domain' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ enum: LeaderboardPeriod, default: LeaderboardPeriod.ALL_TIME })
  @IsOptional()
  @IsEnum(LeaderboardPeriod)
  period?: LeaderboardPeriod = LeaderboardPeriod.ALL_TIME;
}
