import { IsInt, Matches, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const HEURE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Plage de disponibilité hebdomadaire : un jour, de `heure` à `heureFin`. */
export class CreateCreneauDto {
  @ApiProperty({ example: 1, description: '1 = lundi … 7 = dimanche' })
  @IsInt()
  @Min(1)
  @Max(7)
  jourSemaine: number;

  @ApiProperty({ example: '09:00', description: 'Début de la disponibilité' })
  @Matches(HEURE, { message: 'Heure de début attendue au format HH:mm.' })
  heure: string;

  @ApiProperty({ example: '17:00', description: 'Fin de la disponibilité' })
  @Matches(HEURE, { message: 'Heure de fin attendue au format HH:mm.' })
  heureFin: string;
}
