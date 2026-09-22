import { Module } from '@nestjs/common';
import { FormationsController } from './formations.controller';
import { FormationsService } from './formations.service';
import { SupportModule } from '../support/support.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaiementsModule } from '../paiements/paiements.module';

@Module({
  imports: [SupportModule, NotificationsModule, PaiementsModule],
  controllers: [FormationsController],
  providers: [FormationsService],
})
export class FormationsModule {}
