import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCentreDto } from './dto/create-centre.dto';
import { UpdateCentreDto } from './dto/update-centre.dto';
import { CreateCreneauDto } from './dto/create-creneau.dto';

@Injectable()
export class CentresService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createCentreDto: CreateCentreDto) {
    return this.prisma.centre.create({
      data: createCentreDto,
      include: { creneaux: true },
    });
  }

  async findAll() {
    return this.prisma.centre.findMany({
      include: {
        creneaux: { orderBy: { dateHeure: 'asc' } },
      },
    });
  }

  async findOne(id: string) {
    const centre = await this.prisma.centre.findUnique({
      where: { id },
      include: { creneaux: { orderBy: { dateHeure: 'asc' } } },
    });
    if (!centre) throw new NotFoundException('Centre non trouvé');
    return centre;
  }

  async update(id: string, updateCentreDto: UpdateCentreDto) {
    try {
      return await this.prisma.centre.update({
        where: { id },
        data: updateCentreDto,
        include: { creneaux: true },
      });
    } catch {
      throw new NotFoundException('Centre non trouvé');
    }
  }

  async remove(id: string) {
    try {
      return await this.prisma.centre.delete({ where: { id } });
    } catch {
      throw new NotFoundException('Centre non trouvé');
    }
  }

  // ─── Créneaux ───

  async addCreneau(centreId: string, dto: CreateCreneauDto) {
    await this.findOne(centreId);
    return this.prisma.creneau.create({
      data: { centreId, dateHeure: new Date(dto.dateHeure) },
    });
  }

  async removeCreneau(creneauId: string) {
    try {
      return await this.prisma.creneau.delete({ where: { id: creneauId } });
    } catch {
      throw new NotFoundException('Créneau non trouvé');
    }
  }
}
