import { Module } from '@nestjs/common';
import { SignalementsController } from './signalements.controller';
import { SignalementsService } from './signalements.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { ActualitesModule } from '../actualites/actualites.module';

@Module({
  imports: [NotificationsModule, ActualitesModule],
  controllers: [SignalementsController],
  providers: [SignalementsService],
})
export class SignalementsModule {}
