import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { DepartementsService } from './departements.service';
import { CreateDepartementDto } from './dto/create-departement.dto';
import { UpdateDepartementDto } from './dto/update-departement.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('departements')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard, RolesGuard)
@Controller('departements')
export class DepartementsController {
  constructor(private readonly departementsService: DepartementsService) {}

  @Roles(Role.ADMIN, Role.STAFF, Role.RESPONSABLE_PEDAGOGIQUE)
  @Post()
  create(@Body() createDepartementDto: CreateDepartementDto) {
    return this.departementsService.create(createDepartementDto);
  }

  @Get()
  findAll() {
    return this.departementsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.departementsService.findOne(id);
  }

  @Roles(Role.ADMIN, Role.STAFF, Role.RESPONSABLE_PEDAGOGIQUE)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDepartementDto: UpdateDepartementDto) {
    return this.departementsService.update(id, updateDepartementDto);
  }

  @Roles(Role.ADMIN, Role.RESPONSABLE_PEDAGOGIQUE)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.departementsService.remove(id);
  }
}
