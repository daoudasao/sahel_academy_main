import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

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

    const hasRole = requiredRoles.includes(user.role);
    if (!hasRole) {
        throw new ForbiddenException('Vous n\'avez pas les droits nécessaires.');
    }

    return true;
  }
}
