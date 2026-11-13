import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDepartementDto } from './dto/create-departement.dto';
import { UpdateDepartementDto } from './dto/update-departement.dto';
import { NON_SUPPRIME, versCorbeille } from '../corbeille/corbeille.util';

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
      where: NON_SUPPRIME,
      include: {
        _count: {
          select: { formations: { where: NON_SUPPRIME } },
        },
      },
    });
  }

  async findOne(id: string) {
    const departement = await this.prisma.departement.findFirst({
      where: { id, ...NON_SUPPRIME },
      include: {
        formations: { where: NON_SUPPRIME },
      },
    });
    if (!departement) throw new NotFoundException('Département non trouvé');
    return departement;
  }

  async update(id: string, updateDepartementDto: UpdateDepartementDto) {
    try {
      return await this.prisma.departement.update({
        where: { id, ...NON_SUPPRIME },
        data: updateDepartementDto,
      });
    } catch (e) {
      throw new NotFoundException('Département non trouvé');
    }
  }

  /**
   * Envoie le département à la corbeille. Refusé tant qu'il contient des
   * formations actives (elles se retrouveraient sans département).
   */
  async remove(id: string, user?: Parameters<typeof versCorbeille>[0]) {
    const formations = await this.prisma.formation.count({
      where: { departementId: id, ...NON_SUPPRIME },
    });
    if (formations > 0) {
      throw new ConflictException(
        `Ce département contient encore ${formations} formation(s). Supprimez-les ou déplacez-les d'abord.`,
      );
    }
    try {
      return await this.prisma.departement.update({
        where: { id, ...NON_SUPPRIME },
        data: versCorbeille(user),
      });
    } catch (e) {
      throw new NotFoundException('Département non trouvé');
    }
  }
}
