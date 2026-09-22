import { Module } from '@nestjs/common';
import { FormateursController } from './formateurs.controller';
import { FormateursService } from './formateurs.service';

@Module({
  controllers: [FormateursController],
  providers: [FormateursService]
})
export class FormateursModule {}
