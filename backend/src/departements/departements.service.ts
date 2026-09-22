import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDepartementDto } from './dto/create-departement.dto';
import { UpdateDepartementDto } from './dto/update-departement.dto';

@Injectable()
export class DepartementsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDepartementDto: CreateDepartementDto) {
    return this.prisma.departement.create({
      data: createDepartementDto,
    });
  }

  async findAll() {
    return this.prisma.departement.findMany({
      include: {
        _count: {
          select: { formations: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const departement = await this.prisma.departement.findUnique({
      where: { id },
      include: {
        formations: true,
      },
    });
    if (!departement) throw new NotFoundException('Département non trouvé');
    return departement;
  }

  async update(id: string, updateDepartementDto: UpdateDepartementDto) {
    try {
      return await this.prisma.departement.update({
        where: { id },
        data: updateDepartementDto,
      });
    } catch (e) {
      throw new NotFoundException('Département non trouvé');
    }
  }

  async remove(id: string) {
    try {
      return await this.prisma.departement.delete({
        where: { id },
      });
    } catch (e) {
      throw new NotFoundException('Département non trouvé');
    }
  }
}
