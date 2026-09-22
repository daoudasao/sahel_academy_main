import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { auth } from '../auth';
import { Request } from 'express';
import { fromNodeHeaders } from 'better-auth/node';

@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    
    let session: Awaited<ReturnType<typeof auth.api.getSession>>;
    try {
      session = await auth.api.getSession({
        headers: fromNodeHeaders(request.headers),
      });
    } catch {
      throw new UnauthorizedException('Non authentifié');
    }

    if (!session || !session.user) {
      throw new UnauthorizedException('Non authentifié');
    }

    // Un compte désactivé depuis le dashboard ne doit plus accéder à l'API.
    if (session.user.actif === false) {
      throw new UnauthorizedException('Compte désactivé');
    }

    // Attacher l'utilisateur à la requête pour le décorateur @CurrentUser()
    request['user'] = session.user;
    return true;
  }
}
