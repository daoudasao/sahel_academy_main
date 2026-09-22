import { PartialType } from '@nestjs/swagger';
import { CreateFicheDto } from './create-fiche.dto';

export class UpdateFicheDto extends PartialType(CreateFicheDto) {}
