import { Module } from '@nestjs/common';
import { AppInstallsController } from './app-installs.controller';
import { AppInstallsService } from './app-installs.service';

@Module({
  controllers: [AppInstallsController],
  providers: [AppInstallsService],
})
export class AppInstallsModule {}
