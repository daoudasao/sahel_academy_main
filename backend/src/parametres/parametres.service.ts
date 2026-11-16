import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { nomDe } from '../auth/roles.util';
import { UpdateParametresDto } from './dto/update-parametres.dto';
import {
  CLES_PARAMETRES,
  PARAMETRES_DEFAUT,
  Parametres,
  lienWhatsapp,
} from './parametres.util';

@Injectable()
export class ParametresService {
  constructor(private readonly prisma: PrismaService) {}

  /** Tous les paramètres (valeur en base, sinon valeur par défaut). */
  async lire(): Promise<Parametres & { whatsappLien: string | null }> {
    const lignes = await this.prisma.parametre.findMany({
      where: { cle: { in: CLES_PARAMETRES } },
    });
    const valeurs: Parametres = { ...PARAMETRES_DEFAUT };
    for (const l of lignes) {
      if (l.valeur.trim()) valeurs[l.cle as keyof Parametres] = l.valeur;
    }
    return { ...valeurs, whatsappLien: lienWhatsapp(valeurs.whatsappSupport) };
  }

  async modifier(dto: UpdateParametresDto, user?: Parameters<typeof nomDe>[0]) {
    const auteur = nomDe(user) || null;
    const changements = CLES_PARAMETRES.flatMap((cle) => {
      const valeur = dto[cle]?.trim();
      return valeur ? [{ cle, valeur }] : [];
    });
    await this.prisma.$transaction(
      changements.map(({ cle, valeur }) =>
        this.prisma.parametre.upsert({
          where: { cle },
          create: { cle, valeur, updatedByNom: auteur },
          update: { valeur, updatedByNom: auteur },
        }),
      ),
    );
    return this.lire();
  }
}
