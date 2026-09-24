import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuditService, RequeteAuditee } from '../../audit/audit.service';
import { SKIP_AUDIT_KEY } from '../../audit/skip-audit.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly audit: AuditService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (!requiredRoles) {
      return true;
    }
    
    const request = context.switchToHttp().getRequest();
    const user = request.user; // Set by AuthGuard

    if (!user) {
      throw new ForbiddenException('Accès refusé. Connectez-vous d\'abord.');
    }

    // Un SUPER_ADMIN a tous les droits ; sinon il faut l'un des rôles requis.
    const hasRole = user.role === Role.SUPER_ADMIN || requiredRoles.includes(user.role);
    if (!hasRole) {
        const refus = new ForbiddenException('Vous n\'avez pas les droits nécessaires.');
        this.tracerRefus(context, request, refus);
        throw refus;
    }

    return true;
  }

  /**
   * Une écriture refusée faute de droits est tracée dans le journal d'audit
   * (tentative de suppression par un compte non habilité…). Elle a lieu avant
   * les intercepteurs, qui ne la verraient donc pas. Les lectures refusées ne
   * sont pas tracées (journaliserRequete ignore les GET).
   */
  private tracerRefus(
    context: ExecutionContext,
    request: RequeteAuditee,
    refus: ForbiddenException,
  ) {
    const ignorer = this.reflector.getAllAndOverride<boolean>(SKIP_AUDIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (ignorer) return;
    this.audit.journaliserRequete(request, {
      statut: 403,
      succes: false,
      erreur: refus,
    });
  }
}
