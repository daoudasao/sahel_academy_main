import { Module } from '@nestjs/common';
import { EspaceFormateurController } from './espace-formateur.controller';
import { EspaceFormateurService } from './espace-formateur.service';

@Module({
  controllers: [EspaceFormateurController],
  providers: [EspaceFormateurService],
})
export class EspaceFormateurModule {}
