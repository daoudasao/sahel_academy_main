import { Controller, Get, Query, Req, Res, Logger } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { auth, appOrigins } from './auth';

/**
 * Pont OAuth pour les clients web (PWA).
 *
 * Le navigateur ne peut pas reutiliser le cookie de session pose par
 * better-auth : la PWA (sahel-academy.web.app) et l'API (Render) sont sur des
 * domaines differents, et le client HTTP de l'app travaille au token bearer.
 *
 * Le parcours complet :
 *
 *  1. la PWA navigue vers `GET /api/v1/oauth/google/start?redirect=<sonUrl>` ;
 *  2. on demande a better-auth l'URL d'autorisation Google et on y renvoie le
 *     navigateur (en propageant le cookie d'etat OAuth) ;
 *  3. Google renvoie sur `GET /api/v1/auth/callback/google` (better-auth), qui
 *     cree la session et redirige vers `GET /api/v1/oauth/google/callback` ;
 *  4. la session existe alors cote API : on genere un jeton a usage unique et
 *     on renvoie le navigateur vers la PWA avec `#ott=<jeton>` ;
 *  5. la PWA echange ce jeton via `POST /api/v1/auth/one-time-token/verify` et
 *     recupere son token bearer dans l'en-tete `set-auth-token`.
 *
 * Le jeton voyage dans le fragment de l'URL : il n'est jamais envoye au
 * serveur qui heberge la PWA, ni ecrit dans ses logs.
 */
@ApiExcludeController()
@Controller('oauth')
export class OAuthWebController {
  private readonly logger = new Logger(OAuthWebController.name);

  /** Origines vers lesquelles on accepte de renvoyer le navigateur. */
  private readonly originesAutorisees = new Set(
    appOrigins
      .filter((url): url is string => typeof url === 'string' && url.length > 0)
      .map((url) => {
        try {
          return new URL(url).origin;
        } catch {
          return null;
        }
      })
      .filter((origin): origin is string => origin !== null),
  );

  /**
   * Valide l'URL de retour demandee par le client.
   * Empeche de transformer ce pont en redirection ouverte (et donc en fuite de
   * jeton vers un domaine tiers).
   */
  private urlRetourValide(redirect?: string): string | null {
    const defaut = process.env.WEB_URL || appOrigins[0];
    if (!redirect) return defaut ?? null;
    try {
      const url = new URL(redirect);
      if (!this.originesAutorisees.has(url.origin)) {
        this.logger.warn(`Origine de retour refusee: ${url.origin}`);
        return defaut ?? null;
      }
      // Le fragment est reecrit par ce pont : on repart d'une URL propre.
      url.hash = '';
      return url.toString();
    } catch {
      return defaut ?? null;
    }
  }

  private redirigerAvecFragment(
    res: Response,
    urlBase: string,
    fragment: string,
  ) {
    const separateur = urlBase.includes('#') ? '&' : '#';
    res.redirect(302, `${urlBase}${separateur}${fragment}`);
  }

  private get baseUrl(): string {
    return (process.env.BETTER_AUTH_URL || 'http://localhost:3001').replace(
      /\/+$/,
      '',
    );
  }

  /**
   * Demarre la connexion Google pour un client web.
   *
   * A appeler en **navigation de premier niveau** (`window.location.assign`),
   * pas en `fetch` : les cookies poses ici doivent revenir lors du callback.
   */
  @Get('google/start')
  async demarrerGoogle(
    @Query('redirect') redirect: string | undefined,
    @Res() res: Response,
  ) {
    const urlRetour = this.urlRetourValide(redirect);
    if (!urlRetour) {
      res.status(500).send('Aucune URL de retour configuree.');
      return;
    }

    const pont = `${this.baseUrl}/api/v1/oauth/google/callback?redirect=${encodeURIComponent(urlRetour)}`;

    try {
      const reponse = await auth.api.signInSocial({
        body: {
          provider: 'google',
          callbackURL: pont,
          errorCallbackURL: pont,
          disableRedirect: true,
        },
        asResponse: true,
      });

      // better-auth pose un cookie d'etat signe, verifie au retour de Google :
      // il faut le transmettre au navigateur avant la redirection.
      for (const cookie of reponse.headers.getSetCookie()) {
        res.append('Set-Cookie', cookie);
      }

      const data = (await reponse.json()) as { url?: string };
      if (!data.url) {
        throw new Error("better-auth n'a pas renvoye d'URL d'autorisation");
      }
      res.redirect(302, data.url);
    } catch (e) {
      this.logger.error(`Demarrage de la connexion Google impossible: ${e}`);
      this.redirigerAvecFragment(
        res,
        urlRetour,
        'erreur=google_indisponible',
      );
    }
  }

  /**
   * Retour du callback better-auth : convertit la session en jeton a usage
   * unique, puis renvoie le navigateur vers la PWA.
   */
  @Get('google/callback')
  async retourGoogle(
    @Query('redirect') redirect: string | undefined,
    @Query('error') error: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const urlRetour = this.urlRetourValide(redirect);
    if (!urlRetour) {
      res.status(500).send('Aucune URL de retour configuree.');
      return;
    }

    if (error) {
      this.redirigerAvecFragment(
        res,
        urlRetour,
        `erreur=${encodeURIComponent(error)}`,
      );
      return;
    }

    try {
      const headers = fromNodeHeaders(req.headers);
      const session = await auth.api.getSession({ headers });
      if (!session) {
        this.redirigerAvecFragment(res, urlRetour, 'erreur=session_absente');
        return;
      }

      const { token } = await auth.api.generateOneTimeToken({ headers });
      this.redirigerAvecFragment(
        res,
        urlRetour,
        `ott=${encodeURIComponent(token)}`,
      );
    } catch (e) {
      this.logger.error(`Retour Google impossible: ${e}`);
      this.redirigerAvecFragment(res, urlRetour, 'erreur=echange_impossible');
    }
  }
}
