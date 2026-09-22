import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PaiementsModule } from '../paiements/paiements.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PaiementsModule, NotificationsModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
