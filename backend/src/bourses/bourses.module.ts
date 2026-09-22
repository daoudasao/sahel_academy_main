import { Module } from '@nestjs/common';
import { BoursesController } from './bourses.controller';
import { BoursesService } from './bourses.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { SupportModule } from '../support/support.module';

@Module({
  imports: [NotificationsModule, SupportModule],
  controllers: [BoursesController],
  providers: [BoursesService],
})
export class BoursesModule {}

