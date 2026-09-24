import 'dotenv/config';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { bearer, admin, oneTimeToken } from 'better-auth/plugins';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { journaliserConnexion } from '../audit/journal-connexion';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const isProd = process.env.NODE_ENV === 'production';

// ─── Client IDs Google ───
// Le client **Web** doit rester en premier : c'est lui qui sert au flux OAuth
// par redirection (PWA / admin) et c'est aussi l'audience des id tokens emis
// par l'app Flutter quand elle passe `serverClientId`.
// Les clients natifs Android / iOS sont acceptes en plus : sur iOS l'id token
// porte l'audience du client iOS, et certains SDK Android font de meme.
// ─── Origines applicatives autorisees ───
// Source unique pour le CORS (main.ts), les `trustedOrigins` better-auth, les
// WebSockets et la redirection de retour du flux OAuth web.
// En production, aucune origine localhost n'est acceptee.
const ORIGINES_DEV = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:8080', // PWA web en dev local
];

function estLocale(origine: string): boolean {
  try {
    const { hostname } = new URL(origine);
    return hostname === 'localhost' || hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

export const appOrigins: string[] = [
  process.env.FRONTEND_URL,
  process.env.ADMIN_URL,
  process.env.VERIF_URL,
  process.env.WEB_URL, // PWA web (domaine custom eventuel)
  'https://sahel-academy.web.app', // PWA Firebase Hosting
  'https://sahel-academy.firebaseapp.com', // PWA Firebase Hosting (alias)
  ...(isProd ? [] : ORIGINES_DEV),
].filter(
  (origine): origine is string =>
    typeof origine === 'string' &&
    origine.length > 0 &&
    !(isProd && estLocale(origine)),
);

const googleClientIds = [
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_ID_ANDROID, 
  process.env.GOOGLE_CLIENT_ID_IOS,
].filter((id): id is string => typeof id === 'string' && id.length > 0);

/**
 * Extrait la photo de profil (`picture`) d'un id token Google.
 *
 * Pas de verification de signature ici : better-auth a deja valide ce jeton
 * aupres de Google avant de le stocker. On se contente d'en relire une claim.
 */
function photoDepuisIdToken(idToken: string): string | null {
  try {
    const charge = idToken.split('.')[1];
    if (!charge) return null;
    const json = Buffer.from(
      charge.replace(/-/g, '+').replace(/_/g, '/'),
      'base64',
    ).toString('utf8');
    const claims = JSON.parse(json) as { picture?: unknown };
    return typeof claims.picture === 'string' && claims.picture.length > 0
      ? claims.picture
      : null;
  } catch {
    return null;
  }
}

/**
 * Reprend la photo Google comme avatar, **uniquement si l'utilisateur n'en a
 * pas deja une**. Un avatar televerse par l'utilisateur n'est jamais ecrase.
 *
 * Appele a la creation du rattachement (premiere connexion Google) et a
 * chaque rafraichissement du compte (connexions suivantes), pour couvrir
 * aussi les comptes rattaches avant l'ajout de ce comportement.
 */
async function reprendrePhotoGoogle(account: {
  providerId?: string | null;
  userId?: string | null;
  idToken?: string | null;
}): Promise<void> {
  if (account.providerId !== 'google' || !account.userId || !account.idToken) {
    return;
  }

  const photo = photoDepuisIdToken(account.idToken);
  if (!photo) return;

  try {
    const utilisateur = await prisma.user.findUnique({
      where: { id: account.userId },
      select: { image: true },
    });
    if (!utilisateur || (utilisateur.image ?? '').trim().length > 0) return;

    await prisma.user.update({
      where: { id: account.userId },
      data: { image: photo },
    });
  } catch (e) {
    // Une photo manquante ne doit jamais faire echouer la connexion.
    console.warn('[auth] Photo Google non reprise:', e);
  }
}

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3001',
  basePath: '/api/v1/auth',
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: appOrigins,
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 jours (2 592 000s)
    updateAge: 60 * 60 * 24, // Rafraîchissement auto quotidien
  },
  // Auth mobile (Flutter) : token via en-tete Authorization Bearer
  plugins: [
    bearer(),
    // Plugin admin : conservé pour son schéma (rôle, bannissement…). Ses
    // endpoints /auth/admin/* ne sont volontairement accordés à AUCUN rôle de
    // l'application (ils attendent les rôles « admin »/« user » en minuscules) :
    // toute opération d'administration passe par les routes Nest, qui
    // appliquent les droits (dont la protection du SUPER_ADMIN) et sont
    // tracées dans le journal d'audit. Ne pas ajouter `adminRoles` sans
    // reproduire ces garde-fous.
    admin({
      defaultRole: 'ETUDIANT',
    }),
    // Jeton a usage unique : sert de pont pour le flux OAuth web. Apres le
    // retour de Google, le backend (qui a le cookie de session) genere un
    // jeton court que la PWA echange contre un token bearer. Le token de
    // session ne transite donc jamais dans une URL.
    oneTimeToken({
      expiresIn: 3, // minutes
      storeToken: 'hashed',
    }),
  ],

  // ─── Comptes verifies par defaut ───
  // L'inscription ne passe par aucune verification d'e-mail : les comptes sont
  // donc marques verifies des la creation. Sans cela, better-auth refuse de
  // rattacher une identite Google a un compte e-mail existant
  // (`accountLinking.requireLocalEmailVerified`).
  databaseHooks: {
    user: {
      create: {
        before: async (user) => ({ data: { ...user, emailVerified: true } }),
      },
    },
    // ─── Photo de profil Google ───
    // Un compte cree *par* Google recoit sa photo des la creation. Un compte
    // e-mail existant qui se *rattache* a Google, lui, n'en recoit aucune :
    // better-auth ne touche pas au profil lors d'un rattachement. On comble ce
    // trou aux deux moments possibles : le rattachement (premiere connexion
    // Google) et le rafraichissement du compte (connexions suivantes, ce qui
    // rattrape les comptes rattaches avant l'ajout de ce comportement).
    account: {
      create: { after: reprendrePhotoGoogle },
      update: { after: reprendrePhotoGoogle },
    },
    // ─── Journal d'audit ───
    // Une session créée = une connexion (e-mail, Google, échange de jeton
    // PWA…). Seules celles de l'équipe sont tracées.
    session: {
      create: {
        after: async (session) => {
          await journaliserConnexion(prisma, session);
        },
      },
    },
  },
  // ─── Cookies cross-domaine ───
  // En prod (admin & API sur des domaines differents) : SameSite=None + Secure
  // (+ Partitioned/CHIPS). En dev localhost : Lax pour fonctionner en HTTP.
  advanced: {
    defaultCookieAttributes: {
      sameSite: isProd ? 'none' : 'lax',
      secure: isProd,
      httpOnly: true,
      partitioned: isProd,
    },
    // Sous-domaines d'un meme domaine (ex: admin.exemple.com + api.exemple.com) :
    // definir COOKIE_DOMAIN=".exemple.com" pour partager le cookie de session.
    ...(process.env.COOKIE_DOMAIN
      ? { crossSubDomainCookies: { enabled: true, domain: process.env.COOKIE_DOMAIN } }
      : {}),
  },
  // Le schéma utilise `nom` au lieu de `name`, et expose `role`/`actif`
  user: {
    fields: {
      name: 'nom',
    },
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        defaultValue: 'ETUDIANT',
        input: false,
      },
      telephone: {
        type: 'string',
        required: false,
      },
      actif: {
        type: 'boolean',
        required: false,
        defaultValue: true,
        input: false,
      },
    },
  },
  socialProviders: {
    google: {
      clientId: googleClientIds.length > 0 ? googleClientIds : '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    },
    apple: {
      clientId: process.env.APPLE_CLIENT_ID || '',
      clientSecret: process.env.APPLE_CLIENT_SECRET || '',
      teamId: process.env.APPLE_TEAM_ID || '',
      keyId: process.env.APPLE_KEY_ID || '',
      privateKey: process.env.APPLE_PRIVATE_KEY || '',
    },
  },
});
