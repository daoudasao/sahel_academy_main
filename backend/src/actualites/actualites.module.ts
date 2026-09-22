import { Module } from '@nestjs/common';
import { ActualitesController } from './actualites.controller';
import { ActualitesService } from './actualites.service';
import { ActualitesGateway } from './actualites.gateway';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [ActualitesController],
  providers: [ActualitesService, ActualitesGateway],
  exports: [ActualitesGateway],
})
export class ActualitesModule {}

