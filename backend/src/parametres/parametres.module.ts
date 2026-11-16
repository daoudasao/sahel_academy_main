import { Module } from '@nestjs/common';
import { ParametresController } from './parametres.controller';
import { ParametresService } from './parametres.service';

@Module({
  controllers: [ParametresController],
  providers: [ParametresService],
})
export class ParametresModule {}
