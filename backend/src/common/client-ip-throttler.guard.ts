import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Limitation du nombre de requêtes par client.
 *
 * L'API est derrière Cloudflare + Render : l'adresse vue par Express est celle
 * du proxy. Cloudflare transmet l'adresse réelle dans `CF-Connecting-IP` (qu'un
 * client ne peut pas imposer tant que le trafic passe par Cloudflare) ; à
 * défaut on prend la première adresse de `X-Forwarded-For`.
 */
@Injectable()
export class ClientIpThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, any>): Promise<string> {
    const cloudflare = req.headers?.['cf-connecting-ip'];
    if (typeof cloudflare === 'string' && cloudflare.length > 0) {
      return Promise.resolve(cloudflare);
    }
    const ips: unknown = req.ips;
    if (Array.isArray(ips) && typeof ips[0] === 'string' && ips[0]) {
      return Promise.resolve(ips[0]);
    }
    return Promise.resolve(String(req.ip ?? 'inconnu'));
  }
}
