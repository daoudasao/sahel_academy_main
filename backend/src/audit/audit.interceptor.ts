import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { HTTP_CODE_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { estEquipe } from '../auth/roles.util';
import { AuditService, RequeteAuditee } from './audit.service';
import { ACTION_PAR_METHODE } from './audit.util';
import { SKIP_AUDIT_KEY } from './skip-audit.decorator';

/**
 * Trace dans le journal d'audit chaque écriture (POST/PUT/PATCH/DELETE) faite
 * par un membre de l'équipe, qu'elle réussisse ou échoue (règle métier,
 * validation, introuvable…).
 *
 * Les refus de droits levés par RolesGuard surviennent AVANT les
 * intercepteurs : c'est le guard lui-même qui les trace.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly audit: AuditService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const req = context.switchToHttp().getRequest<RequeteAuditee>();
    const methode = (req.method ?? '').toUpperCase();
    // Seules les écritures de l'équipe sont tracées (ni lectures, ni élèves).
    if (!ACTION_PAR_METHODE[methode] || !estEquipe(req.user)) {
      return next.handle();
    }
    const ignorer = this.reflector.getAllAndOverride<boolean>(SKIP_AUDIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (ignorer) return next.handle();

    // Statut renvoyé en cas de succès : @HttpCode s'il est défini, sinon le
    // défaut de Nest (201 pour un POST, 200 sinon).
    const statutSucces =
      this.reflector.get<number | undefined>(
        HTTP_CODE_METADATA,
        context.getHandler(),
      ) ?? (methode === 'POST' ? 201 : 200);

    return next.handle().pipe(
      tap((reponse: unknown) =>
        this.audit.journaliserRequete(req, {
          statut: statutSucces,
          succes: true,
          reponse,
        }),
      ),
      catchError((erreur: unknown) => {
        const statut = erreur instanceof HttpException ? erreur.getStatus() : 500;
        this.audit.journaliserRequete(req, { statut, succes: false, erreur });
        return throwError(() => erreur);
      }),
    );
  }
}
