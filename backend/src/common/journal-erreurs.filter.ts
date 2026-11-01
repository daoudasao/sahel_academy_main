import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import type { Request } from 'express';

/**
 * Journalise le motif de chaque erreur, puis laisse Nest produire la réponse
 * habituelle. Les 5xx sortent avec leur stack, les 4xx avec leur message.
 */
@Catch()
export class JournalErreursFilter extends BaseExceptionFilter {
  private readonly logger = new Logger('Erreur');

  catch(exception: unknown, host: ArgumentsHost) {
    if (host.getType() === 'http') {
      const req = host.switchToHttp().getRequest<Request>();
      const chemin = `${req.method} ${req.originalUrl.split('?')[0]}`;

      if (exception instanceof HttpException) {
        const statut = exception.getStatus();
        if (statut >= HttpStatus.INTERNAL_SERVER_ERROR) {
          this.logger.error(`${chemin} → ${statut} ${exception.message}`, exception.stack);
        } else {
          const reponse = exception.getResponse();
          const detail =
            typeof reponse === 'object' && reponse !== null && 'message' in reponse
              ? (reponse as { message: unknown }).message
              : exception.message;
          this.logger.warn(
            `${chemin} → ${statut} ${Array.isArray(detail) ? detail.join('; ') : String(detail)}`,
          );
        }
      } else {
        const err = exception instanceof Error ? exception : new Error(String(exception));
        this.logger.error(`${chemin} → 500 ${err.message}`, err.stack);
      }
    }
    super.catch(exception, host);
  }
}
