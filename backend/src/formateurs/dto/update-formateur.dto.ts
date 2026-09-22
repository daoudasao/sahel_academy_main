import { PartialType } from '@nestjs/swagger';
import { CreateFormateurDto } from './create-formateur.dto';

export class UpdateFormateurDto extends PartialType(CreateFormateurDto) {}
