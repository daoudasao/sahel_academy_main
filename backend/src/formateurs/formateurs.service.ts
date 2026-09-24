import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { definirMotDePasse } from '../auth/mot-de-passe';
import { CreateCompteFormateurDto } from './dto/create-compte-formateur.dto';
import { CreateFormateurDto } from './dto/create-formateur.dto';
import { UpdateFormateurDto } from './dto/update-formateur.dto';
import { CreateFicheDto } from './dto/create-fiche.dto';
import { UpdateFicheDto } from './dto/update-fiche.dto';
import { CreateVersementDto } from './dto/create-versement.dto';

@Injectable()
export class FormateursService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crée le compte de connexion d'un formateur. Le rôle FORMATEUR est imposé :
   * ce point d'entrée ne peut pas servir à créer un compte d'administration.
   */
  async creerCompte(dto: CreateCompteFormateurDto) {
    // better-auth compare les e-mails en minuscules à la connexion.
    const email = dto.email.trim().toLowerCase();
    const messageDoublon =
      'Un compte existe déjà avec cet e-mail : liez plutôt ce formateur au compte existant.';
    const existant = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existant) throw new ConflictException(messageDoublon);

    let user: { id: string; nom: string; email: string; role: Role };
    try {
      user = await this.prisma.user.create({
        data: {
          nom: dto.nom.trim(),
          email,
          telephone: dto.telephone?.trim() || undefined,
          role: Role.FORMATEUR,
        },
        select: { id: true, nom: true, email: true, role: true },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(messageDoublon);
      }
      throw e;
    }

    try {
      await definirMotDePasse(user.id, dto.motDePasse);
    } catch {
      // Pas de compte sans mot de passe : on annule la création.
      await this.prisma.user.delete({ where: { id: user.id } }).catch(() => undefined);
      throw new BadRequestException('Impossible de définir le mot de passe du compte.');
    }
    return user;
  }

  async create(createFormateurDto: CreateFormateurDto) {
    return this.prisma.formateur.create({
      data: createFormateurDto,
    });
  }

  async findAll() {
    const formateurs = await this.prisma.formateur.findMany({
      include: {
        formations: {
          include: {
            echeances: true,
          },
        },
        _count: {
          select: { formations: true },
        },
      },
    });

    return formateurs.map((f) => {
      let gainFormateurTotal = 0;
      let totalEncaissements = 0;

      for (const form of f.formations) {
        const enc = form.echeances.reduce((s, e) => s + (e.montantPaye || 0), 0);
        totalEncaissements += enc;
        const pct = form.pourcentageFormateur ?? 30;
        gainFormateurTotal += Math.round(enc * (pct / 100));
      }

      return {
        ...f,
        totalEncaissements,
        gainFormateurTotal,
        partCentreTotal: totalEncaissements - gainFormateurTotal,
      };
    });
  }

  async findOne(id: string) {
    const formateur = await this.prisma.formateur.findUnique({
      where: { id },
      include: {
        formations: {
          include: {
            echeances: true,
          },
        },
      },
    });
    if (!formateur) throw new NotFoundException('Formateur non trouvé');

    let totalEncaissementsGlobal = 0;
    let gainFormateurTotal = 0;
    let partCentreTotal = 0;

    const formationsGains = formateur.formations.map((f) => {
      const encaissementsFormation = f.echeances.reduce((s, e) => s + (e.montantPaye || 0), 0);
      const pourcentage = f.pourcentageFormateur ?? 30;
      const gainFormateur = Math.round(encaissementsFormation * (pourcentage / 100));
      const partCentre = encaissementsFormation - gainFormateur;

      totalEncaissementsGlobal += encaissementsFormation;
      gainFormateurTotal += gainFormateur;
      partCentreTotal += partCentre;

      return {
        id: f.id,
        titre: f.titre,
        pourcentageFormateur: pourcentage,
        pourcentage,
        encaissements: encaissementsFormation,
        gainFormateur,
        partCentre,
      };
    });

    return {
      ...formateur,
      totalEncaissementsGlobal,
      gainFormateurTotal,
      partCentreTotal,
      formationsGains,
    };
  }

  async getGains(id: string) {
    return this.findOne(id);
  }

  async update(id: string, updateFormateurDto: UpdateFormateurDto) {
    try {
      return await this.prisma.formateur.update({
        where: { id },
        data: updateFormateurDto,
      });
    } catch {
      throw new NotFoundException('Formateur non trouvé');
    }
  }

  async remove(id: string) {
    try {
      return await this.prisma.formateur.delete({
        where: { id },
      });
    } catch {
      throw new NotFoundException('Formateur non trouvé');
    }
  }

  // ─── Salaires : fiches ───

  async getSalaires(formateurId: string) {
    return this.prisma.ficheSalaire.findMany({
      where: { formateurId },
      include: { versements: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createFiche(formateurId: string, dto: CreateFicheDto) {
    await this.findOne(formateurId); // 404 si le formateur n'existe pas
    return this.prisma.ficheSalaire.create({
      data: { formateurId, mois: dto.mois, montantDu: dto.montantDu },
      include: { versements: true },
    });
  }

  async updateFiche(ficheId: string, dto: UpdateFicheDto) {
    try {
      return await this.prisma.ficheSalaire.update({
        where: { id: ficheId },
        data: dto,
        include: { versements: true },
      });
    } catch {
      throw new NotFoundException('Fiche de salaire non trouvée');
    }
  }

  async removeFiche(ficheId: string) {
    try {
      return await this.prisma.ficheSalaire.delete({ where: { id: ficheId } });
    } catch {
      throw new NotFoundException('Fiche de salaire non trouvée');
    }
  }

  // ─── Salaires : versements ───

  async addVersement(ficheId: string, dto: CreateVersementDto) {
    const fiche = await this.prisma.ficheSalaire.findUnique({
      where: { id: ficheId },
      include: { versements: true },
    });
    if (!fiche) throw new NotFoundException('Fiche de salaire non trouvée');

    const totalVerse = fiche.versements.reduce((s, v) => s + v.montant, 0);
    const reste = Math.max(0, fiche.montantDu - totalVerse);
    const montant = Math.min(dto.montant, reste);
    if (montant <= 0) {
      throw new BadRequestException(
        'Montant invalide ou supérieur au reste dû pour cette fiche.',
      );
    }

    return this.prisma.versementSalaire.create({
      data: {
        ficheId,
        montant,
        date: dto.date ? new Date(dto.date) : new Date(),
        note: dto.note,
      },
    });
  }

  async removeVersement(versementId: string) {
    try {
      return await this.prisma.versementSalaire.delete({
        where: { id: versementId },
      });
    } catch {
      throw new NotFoundException('Versement non trouvé');
    }
  }
}
