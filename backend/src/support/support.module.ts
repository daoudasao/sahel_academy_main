import { Module } from '@nestjs/common';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';
import { SupportGateway } from './support.gateway';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [SupportController],
  providers: [SupportService, SupportGateway],
  exports: [SupportService, SupportGateway],
})
export class SupportModule {}

