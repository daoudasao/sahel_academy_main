import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateFcmTokenDto {
  @ApiProperty({
    example: 'fcm_token_sample_string_123456',
    description: 'Le token FCM (Firebase Cloud Messaging) de l’appareil de l’utilisateur',
  })
  @IsString()
  @IsNotEmpty()
  fcmToken: string;
}
