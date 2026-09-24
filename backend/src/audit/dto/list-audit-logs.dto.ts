import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ACTIONS_AUDIT } from '../audit.util';

/** Filtres et pagination du journal d'audit. */
export class ListAuditLogsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limite?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  userId?: string;

  @IsOptional()
  @IsIn(ACTIONS_AUDIT)
  action?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  ressource?: string;

  /**
   * « true » / « false » en chaîne : avec enableImplicitConversion, un
   * booléen déclaré transformerait « false » en true.
   */
  @IsOptional()
  @IsIn(['true', 'false'])
  succes?: 'true' | 'false';

  /** Début de période (ISO 8601, calculé côté client en heure locale). */
  @IsOptional()
  @IsISO8601()
  du?: string;

  /** Fin de période (ISO 8601). */
  @IsOptional()
  @IsISO8601()
  au?: string;

  /** Recherche libre : auteur, e-mail, élément, route ou identifiant. */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  recherche?: string;
}
