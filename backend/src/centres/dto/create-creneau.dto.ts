import { IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCreneauDto {
  @ApiProperty({ example: '2026-09-08T09:00:00Z' })
  @IsDateString()
  dateHeure: string;
}
