import { SetMetadata } from '@nestjs/common';
import type { CleContexte } from './contextes';

export const AUDIT_CONTEXTE_KEY = 'auditContexte';

/**
 * Enrichit la trace d'audit d'une route avec l'état de l'élément touché :
 * « avant » (modification, suppression, tentative refusée) et « après »
 * (création, modification), plus un libellé lisible (montant, élève…).
 * Voir CONTEXTES_AUDIT.
 */
export const AuditContexte = (cle: CleContexte) => SetMetadata(AUDIT_CONTEXTE_KEY, cle);
