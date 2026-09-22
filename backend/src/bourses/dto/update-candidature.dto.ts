import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { StatutAdmission } from '@prisma/client';

export class UpdateCandidatureDto {
  @ApiProperty({ enum: StatutAdmission, example: 'admis' })
  @IsEnum(StatutAdmission)
  statut: StatutAdmission;
}
