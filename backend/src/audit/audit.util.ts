import { HttpException } from '@nestjs/common';

/** Actions tracées dans le journal d'audit. */
export const ACTIONS_AUDIT = [
  'CREATION',
  'MODIFICATION',
  'SUPPRESSION',
  'CONNEXION',
  'ATTRIBUTION_ROLE',
] as const;

export type ActionAudit = (typeof ACTIONS_AUDIT)[number];

/** Seules les écritures sont tracées : les lectures (GET) ne le sont pas. */
export const ACTION_PAR_METHODE: Readonly<Record<string, ActionAudit>> = {
  POST: 'CREATION',
  PUT: 'MODIFICATION',
  PATCH: 'MODIFICATION',
  DELETE: 'SUPPRESSION',
};

/** Clés jamais recopiées dans le journal (mots de passe, jetons…). */
const CLE_SENSIBLE = /pass|secret|token|cookie|authorization|otp/i;
const MAX_CHAINE = 500;
const MAX_ELEMENTS = 50;
const MAX_PROFONDEUR = 4;

/**
 * Copie « sûre » d'une valeur (corps de requête…) pour le journal : secrets
 * masqués, chaînes et tableaux tronqués, profondeur limitée, pas de binaire.
 */
export function nettoyer(valeur: unknown, profondeur = 0): unknown {
  if (valeur === null || valeur === undefined) return null;
  if (typeof valeur === 'string') {
    return valeur.length > MAX_CHAINE ? `${valeur.slice(0, MAX_CHAINE)}…` : valeur;
  }
  if (typeof valeur === 'number' || typeof valeur === 'boolean') return valeur;
  if (valeur instanceof Date) return valeur.toISOString();
  if (Buffer.isBuffer(valeur)) return '[binaire]';
  if (profondeur >= MAX_PROFONDEUR) return '[…]';
  if (Array.isArray(valeur)) {
    const items = valeur
      .slice(0, MAX_ELEMENTS)
      .map((v) => nettoyer(v, profondeur + 1));
    if (valeur.length > MAX_ELEMENTS) {
      items.push(`… (+${valeur.length - MAX_ELEMENTS})`);
    }
    return items;
  }
  if (typeof valeur === 'object') {
    const sortie: Record<string, unknown> = {};
    for (const [cle, v] of Object.entries(valeur)) {
      sortie[cle] = CLE_SENSIBLE.test(cle) ? '[masqué]' : nettoyer(v, profondeur + 1);
    }
    return sortie;
  }
  return String(valeur);
}

/** Champs essayés, dans l'ordre, pour nommer l'élément touché. */
const CHAMPS_LIBELLE = ['titre', 'nom', 'name', 'libelle', 'label', 'intitule', 'email'];

/**
 * Libellé lisible de l'élément touché (titre d'une bourse, nom d'un
 * utilisateur…), cherché d'abord dans la réponse puis dans le corps envoyé.
 */
export function libelleDe(...sources: unknown[]): string | null {
  for (const source of sources) {
    if (!source || typeof source !== 'object' || Array.isArray(source)) continue;
    for (const champ of CHAMPS_LIBELLE) {
      const v = (source as Record<string, unknown>)[champ];
      if (typeof v === 'string' && v.trim()) return v.trim().slice(0, 200);
    }
  }
  return null;
}

/** Identifiant de l'élément touché : paramètre de route, sinon id renvoyé. */
export function idDe(
  params: Record<string, unknown> | undefined,
  reponse: unknown,
): string | null {
  if (typeof params?.id === 'string' && params.id) return params.id;
  const premier = params
    ? Object.values(params).find((v): v is string => typeof v === 'string' && !!v)
    : undefined;
  if (premier) return premier;
  if (reponse && typeof reponse === 'object' && !Array.isArray(reponse)) {
    const id = (reponse as Record<string, unknown>).id;
    if (typeof id === 'string') return id;
  }
  return null;
}

type RequeteHttp = {
  headers?: Record<string, unknown>;
  ips?: unknown;
  ip?: unknown;
  route?: { path?: unknown };
  path?: unknown;
};

/**
 * Adresse IP réelle du client, même logique que ClientIpThrottlerGuard :
 * `CF-Connecting-IP` (Cloudflare) d'abord, puis l'adresse vue par Express.
 */
export function ipDe(req: RequeteHttp): string | null {
  const cloudflare = req.headers?.['cf-connecting-ip'];
  if (typeof cloudflare === 'string' && cloudflare) return cloudflare;
  if (Array.isArray(req.ips) && typeof req.ips[0] === 'string' && req.ips[0]) {
    return req.ips[0];
  }
  return typeof req.ip === 'string' && req.ip ? req.ip : null;
}

export function userAgentDe(req: RequeteHttp): string | null {
  const ua = req.headers?.['user-agent'];
  return typeof ua === 'string' && ua ? ua.slice(0, 300) : null;
}

/** Route appelée, sans le préfixe /api/v1 (ex. `bourses/:id/champs`). */
export function routeDe(req: RequeteHttp): string {
  const brut =
    typeof req.route?.path === 'string'
      ? req.route.path
      : typeof req.path === 'string'
        ? req.path
        : '';
  return brut.replace(/^\/?api\/v1\/?/, '').replace(/^\/+/, '') || '/';
}

/** Message lisible d'une erreur, pour le détail d'une action échouée. */
export function messageErreur(erreur: unknown): string {
  if (erreur instanceof HttpException) {
    const corps = erreur.getResponse();
    if (typeof corps === 'string') return corps.slice(0, 500);
    const message = (corps as { message?: unknown })?.message;
    if (Array.isArray(message)) return message.join(', ').slice(0, 500);
    if (typeof message === 'string') return message.slice(0, 500);
  }
  if (erreur instanceof Error) return erreur.message.slice(0, 500);
  return String(erreur).slice(0, 500);
}
