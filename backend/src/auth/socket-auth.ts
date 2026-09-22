import type { IncomingMessage } from 'http';
import type { Socket } from 'socket.io';
import { fromNodeHeaders } from 'better-auth/node';
import { auth, appOrigins } from './auth';

/** Origines (schéma + hôte + port) des frontends de confiance. */
export const originesSocket: string[] = [
  ...new Set(
    appOrigins
      .map((url) => {
        try {
          return new URL(url).origin;
        } catch {
          return null;
        }
      })
      .filter((origin): origin is string => origin !== null),
  ),
];

/**
 * Filtre des connexions WebSocket (option `allowRequest` de socket.io).
 *
 * Les apps natives n'envoient pas d'en-tête `Origin` : elles passent. Un
 * navigateur, lui, doit venir d'un frontend de confiance — sinon n'importe
 * quel site pourrait ouvrir un socket avec les cookies de la victime.
 */
export function filtrerOrigineSocket(
  req: IncomingMessage,
  callback: (err: string | null | undefined, success: boolean) => void,
) {
  const origin = req.headers.origin;
  callback(null, !origin || originesSocket.includes(origin));
}

/**
 * Options communes à tous les gateways. NestJS crée un seul serveur socket.io
 * pour tous les namespaces : ces options doivent être identiques partout.
 */
export const optionsSocket = {
  cors: { origin: originesSocket, credentials: true },
  allowRequest: filtrerOrigineSocket,
};

/**
 * Authentifie un socket avec la session better-auth : token bearer envoyé
 * dans `auth.token` (apps) ou cookie de session (dashboard).
 * Renvoie `null` si la session est absente, invalide ou le compte désactivé.
 */
export async function authentifierSocket(socket: Socket) {
  const rawToken: unknown =
    socket.handshake.auth?.token || socket.handshake.headers?.authorization;

  let headers = socket.handshake.headers;
  if (typeof rawToken === 'string' && rawToken.length > 0) {
    const bearer = rawToken.startsWith('Bearer ')
      ? rawToken
      : `Bearer ${rawToken}`;
    headers = { ...headers, authorization: bearer };
  }

  const session = await auth.api.getSession({
    headers: fromNodeHeaders(headers),
  });
  if (!session?.user || session.user.actif === false) return null;
  return session.user;
}
