import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCentreDto } from './dto/create-centre.dto';
import { UpdateCentreDto } from './dto/update-centre.dto';
import { CreateCreneauDto } from './dto/create-creneau.dto';
import { NON_SUPPRIME, versCorbeille } from '../corbeille/corbeille.util';
import { deplierCreneaux } from './creneaux.util';
import type { Centre, Creneau } from '@prisma/client';

/** Ordre d'affichage dans le dashboard : hebdomadaires (lundi → dimanche) puis datés. */
const ORDRE_CRENEAUX = [
  { jourSemaine: { sort: 'asc', nulls: 'last' } },
  { heure: 'asc' },
  { dateHeure: 'asc' },
] as const;

/**
 * `gestion` = créneaux tels qu'enregistrés (dashboard) ;
 * sinon créneaux hebdomadaires dépliés en dates (app).
 */
function pourAffichage<T extends Centre & { creneaux: Creneau[] }>(
  centre: T,
  gestion: boolean,
) {
  return gestion
    ? centre
    : { ...centre, creneaux: deplierCreneaux(centre.creneaux) };
}

@Injectable()
export class CentresService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createCentreDto: CreateCentreDto) {
    return this.prisma.centre.create({
      data: createCentreDto,
      include: { creneaux: true },
    });
  }

  async findAll(gestion = false) {
    const centres = await this.prisma.centre.findMany({
      where: NON_SUPPRIME,
      include: { creneaux: { orderBy: [...ORDRE_CRENEAUX] } },
    });
    return centres.map((c) => pourAffichage(c, gestion));
  }

  async findOne(id: string, gestion = false) {
    const centre = await this.prisma.centre.findFirst({
      where: { id, ...NON_SUPPRIME },
      include: { creneaux: { orderBy: [...ORDRE_CRENEAUX] } },
    });
    if (!centre) throw new NotFoundException('Centre non trouvé');
    return pourAffichage(centre, gestion);
  }

  async update(id: string, updateCentreDto: UpdateCentreDto) {
    try {
      return await this.prisma.centre.update({
        where: { id, ...NON_SUPPRIME },
        data: updateCentreDto,
        include: { creneaux: true },
      });
    } catch {
      throw new NotFoundException('Centre non trouvé');
    }
  }

  /** Envoie le centre à la corbeille (créneaux conservés). */
  async remove(id: string, user?: Parameters<typeof versCorbeille>[0]) {
    try {
      return await this.prisma.centre.update({
        where: { id, ...NON_SUPPRIME },
        data: versCorbeille(user),
      });
    } catch {
      throw new NotFoundException('Centre non trouvé');
    }
  }

  // ─── Créneaux ───

  async addCreneau(centreId: string, dto: CreateCreneauDto) {
    await this.findOne(centreId, true);
    if (dto.jourSemaine && dto.heure) {
      const existant = await this.prisma.creneau.findFirst({
        where: { centreId, jourSemaine: dto.jourSemaine, heure: dto.heure },
      });
      if (existant) return existant;
      return this.prisma.creneau.create({
        data: { centreId, jourSemaine: dto.jourSemaine, heure: dto.heure },
      });
    }
    if (dto.dateHeure) {
      return this.prisma.creneau.create({
        data: { centreId, dateHeure: new Date(dto.dateHeure) },
      });
    }
    throw new BadRequestException(
      'Indiquez un jour de la semaine et une heure, ou une date précise.',
    );
  }

  async removeCreneau(creneauId: string) {
    try {
      return await this.prisma.creneau.delete({ where: { id: creneauId } });
    } catch {
      throw new NotFoundException('Créneau non trouvé');
    }
  }
}
