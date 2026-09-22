import { Module } from '@nestjs/common';
import { DepartementsController } from './departements.controller';
import { DepartementsService } from './departements.service';

@Module({
  controllers: [DepartementsController],
  providers: [DepartementsService]
})
export class DepartementsModule {}
