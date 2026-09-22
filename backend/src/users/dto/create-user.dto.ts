import { IsString, IsEmail, IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { Role } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'Jean Dupont' })
  @IsString()
  nom: string;

  @ApiProperty({ example: 'jean.dupont@email.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '+223 70 00 11 22', required: false })
  @IsString()
  @IsOptional()
  telephone?: string;

  @ApiProperty({ example: 'ETUDIANT', enum: Role, required: false })
  @IsEnum(Role)
  @IsOptional()
  role?: Role;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  actif?: boolean;
}
