import { Module } from '@nestjs/common';
import { ActualitesModule } from '../actualites/actualites.module';
import { CorbeilleController } from './corbeille.controller';
import { CorbeilleService } from './corbeille.service';

@Module({
  imports: [ActualitesModule],
  controllers: [CorbeilleController],
  providers: [CorbeilleService],
})
export class CorbeilleModule {}
