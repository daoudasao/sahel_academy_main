import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { RendezVousController } from './rendez-vous.controller';
import { RendezVousService } from './rendez-vous.service';

@Module({
  imports: [NotificationsModule],
  controllers: [RendezVousController],
  providers: [RendezVousService],
})
export class RendezVousModule {}
