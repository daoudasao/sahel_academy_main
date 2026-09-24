import { SetMetadata } from '@nestjs/common';

export const SKIP_AUDIT_KEY = 'skipAudit';

/**
 * Exclut une route du journal d'audit. À réserver aux écritures sans intérêt
 * pour la traçabilité (lecture d'une notification, like, jeton push…), qui
 * noieraient les vraies actions.
 */
export const SkipAudit = () => SetMetadata(SKIP_AUDIT_KEY, true);
