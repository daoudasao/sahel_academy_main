import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export const DECISIONS_SIGNALEMENT = ['supprimer', 'rejeter'] as const;
export type DecisionSignalement = (typeof DECISIONS_SIGNALEMENT)[number];

export class TraiterSignalementDto {
  /** « supprimer » retire le contenu ; « rejeter » le conserve. */
  @ApiProperty({ enum: DECISIONS_SIGNALEMENT })
  @IsIn(DECISIONS_SIGNALEMENT)
  decision: DecisionSignalement;

  /** Note interne de la modération (non envoyée à l'utilisateur). */
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  note?: string;
}
