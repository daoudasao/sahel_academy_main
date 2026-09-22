import { PartialType } from '@nestjs/swagger';
import { CreateBourseDto } from './create-bourse.dto';

export class UpdateBourseDto extends PartialType(CreateBourseDto) {}
