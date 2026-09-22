import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { CentresService } from './centres.service';
import { CreateCentreDto } from './dto/create-centre.dto';
import { UpdateCentreDto } from './dto/update-centre.dto';
import { CreateCreneauDto } from './dto/create-creneau.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('centres')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard, RolesGuard)
@Controller('centres')
export class CentresController {
  constructor(private readonly centresService: CentresService) {}

  @Roles(Role.ADMIN, Role.STAFF, Role.RESPONSABLE_PEDAGOGIQUE)
  @Post()
  create(@Body() createCentreDto: CreateCentreDto) {
    return this.centresService.create(createCentreDto);
  }

  @Get()
  findAll() {
    return this.centresService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.centresService.findOne(id);
  }

  @Roles(Role.ADMIN, Role.STAFF, Role.RESPONSABLE_PEDAGOGIQUE)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCentreDto: UpdateCentreDto) {
    return this.centresService.update(id, updateCentreDto);
  }

  @Roles(Role.ADMIN, Role.RESPONSABLE_PEDAGOGIQUE)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.centresService.remove(id);
  }

  // ─── Créneaux ───

  @Roles(Role.ADMIN, Role.STAFF, Role.RESPONSABLE_PEDAGOGIQUE)
  @Post(':id/creneaux')
  addCreneau(@Param('id') id: string, @Body() dto: CreateCreneauDto) {
    return this.centresService.addCreneau(id, dto);
  }

  @Roles(Role.ADMIN, Role.RESPONSABLE_PEDAGOGIQUE)
  @Delete(':id/creneaux/:creneauId')
  removeCreneau(@Param('creneauId') creneauId: string) {
    return this.centresService.removeCreneau(creneauId);
  }
}
