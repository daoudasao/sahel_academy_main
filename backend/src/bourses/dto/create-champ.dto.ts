import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsArray,
  IsInt,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TypeChamp } from '@prisma/client';

export class CreateChampDto {
  @ApiProperty({ example: 'Motivation' })
  @IsString()
  label: string;

  @ApiProperty({ enum: TypeChamp, required: false })
  @IsEnum(TypeChamp)
  @IsOptional()
  type?: TypeChamp;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  obligatoire?: boolean;

  @ApiProperty({ type: [String], required: false })
  @IsArray()
  @IsOptional()
  options?: string[];

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  aide?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  cle?: string;

  @ApiProperty({ required: false })
  @IsInt()
  @IsOptional()
  ordre?: number;
}
