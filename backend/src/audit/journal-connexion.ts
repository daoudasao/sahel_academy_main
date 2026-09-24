import type { PrismaClient } from '@prisma/client';
import { estEquipe } from '../auth/roles.util';

/**
 * Trace la connexion d'un membre de l'équipe (appelé par better-auth à la
 * création d'une session). Les connexions des élèves ne sont pas tracées.
 * N'échoue jamais : la connexion ne doit pas être bloquée par le journal.
 */
export async function journaliserConnexion(
  prisma: PrismaClient,
  session: { userId: string; ipAddress?: string | null; userAgent?: string | null },
): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, nom: true, email: true, role: true },
    });
    if (!user || !estEquipe(user)) return;

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        userNom: user.nom,
        userEmail: user.email,
        userRole: user.role,
        action: 'CONNEXION',
        ressource: 'auth',
        libelle: user.email,
        methode: 'POST',
        route: 'auth/session',
        statut: 200,
        succes: true,
        ip: session.ipAddress || null,
        userAgent: session.userAgent?.slice(0, 300) || null,
      },
    });
  } catch (e) {
    console.warn('[audit] Connexion non journalisée :', e);
  }
}
