import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../auth';

/**
 * Variante d'AuthGuard pour les routes publiques : elle ne refuse jamais la
 * requête. Si une session valide est présente, l'utilisateur est attaché à la
 * requête (lisible avec @CurrentUser) ; sinon la route reste publique.
 *
 * Sert à renvoyer un détail complet à l'équipe et une version réduite au
 * public sur une même route.
 */
@Injectable()
export class OptionalAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    try {
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(request.headers),
      });
      if (session?.user && session.user.actif !== false) {
        request['user'] = session.user;
      }
    } catch {
      // Session absente ou invalide : accès public.
    }
    return true;
  }
}
