import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PingInstallDto {
  @ApiProperty({
    description: 'Empreinte unique de l\'appareil (hash opaque)',
    example: 'a1b2c3d4e5f6',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  deviceFingerprint: string;

  @ApiProperty({
    description: 'Plateforme : android | ios | web | linux | macos | windows',
    example: 'android',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  plateforme: string;

  @ApiProperty({
    description: 'Type d\'installation : pwa | native | navigateur',
    example: 'native',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  typeInstallation: string;

  @ApiPropertyOptional({
    description: 'Version de l\'application',
    example: '1.2.0',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  appVersion?: string;

  @ApiPropertyOptional({
    description: 'Modèle ou nom de l\'appareil',
    example: 'Samsung Galaxy A54',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  deviceModel?: string;
}
