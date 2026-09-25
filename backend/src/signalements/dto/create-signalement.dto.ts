import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MotifSignalement, TypeSignalement } from '@prisma/client';

export class CreateSignalementDto {
  @ApiProperty({ enum: TypeSignalement })
  @IsEnum(TypeSignalement)
  type: TypeSignalement;

  /** Id du message ou du commentaire signalé. */
  @ApiProperty({ example: 'clx0abc123' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  contenuId: string;

  @ApiProperty({ enum: MotifSignalement })
  @IsEnum(MotifSignalement)
  motif: MotifSignalement;

  @ApiProperty({ required: false, example: 'Il insulte les autres élèves.' })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  details?: string;
}
