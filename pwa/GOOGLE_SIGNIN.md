# Connexion Google — mise en service

Le code est en place des deux côtés. Il ne reste qu'à créer les clients OAuth
dans Google Cloud et à renseigner les identifiants.

## En bref : mettre la PWA en service

Le parcours web ne demande **qu'un seul client OAuth** et **aucune** valeur
côté app. Trois étapes :

1. créer le client **Application Web** et y déclarer l'URI de redirection
   `https://sahel-academy-backend.onrender.com/api/v1/auth/callback/google` ;
2. poser `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` et `BETTER_AUTH_URL` dans
   l'environnement Render, puis redéployer le backend ;
3. `flutter build web --release` et `firebase deploy --only hosting`.

Android et iOS peuvent attendre : ils ont besoin de clients supplémentaires et
d'un `--dart-define` au build (section 3), mais le web n'en dépend pas.

## 1. Créer les clients OAuth

Console Google Cloud → **APIs & Services → Credentials**, dans le **même projet
que Firebase** (`sahel-academy`).

Avant tout : **OAuth consent screen** → type *External*, nom de l'app, e-mail de
support, domaine autorisé `sahel-academy.web.app`, scopes `email`, `profile`,
`openid`.

| Client à créer | Quand | À renseigner |
|---|---|---|
| **Application Web** | toujours (obligatoire) | *Authorized redirect URIs* : `https://sahel-academy-backend.onrender.com/api/v1/auth/callback/google`, et `http://localhost:3001/api/v1/auth/callback/google` pour le dev. Les *Authorized JavaScript origins* ne servent pas : le flux est entièrement côté serveur, le navigateur ne parle jamais à Google en JavaScript. |
| **Android** | app Android | nom de package `com.sahelacademy.app` + empreinte **SHA-1** (`cd android && ./gradlew signingReport`, une pour debug, une pour la clé de release). Firebase le crée souvent tout seul quand la SHA-1 est ajoutée à la console Firebase. |
| **iOS** | app iOS | bundle ID `com.sahelacademy.app` |

Le client **Web** est la pièce centrale : c'est lui qui porte le flux par
redirection de la PWA, et c'est son identifiant qui devient l'audience de
l'`id_token` émis par Android (via `serverClientId`).

⚠️ L'URI de redirection doit être recopiée **au caractère près** — Google
refuse le flux à la moindre différence.

## 2. Backend (`sahel_academy_backend/.env`)

```env
BETTER_AUTH_URL="https://sahel-academy-backend.onrender.com"
GOOGLE_CLIENT_ID="<client Web>.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="<secret du client Web>"
# facultatifs — audiences supplémentaires acceptées pour les id tokens natifs
GOOGLE_CLIENT_ID_ANDROID="<client Android>.apps.googleusercontent.com"
GOOGLE_CLIENT_ID_IOS="<client iOS>.apps.googleusercontent.com"
```

`BETTER_AUTH_URL` doit être l'URL publique de l'API : elle sert à construire
l'URI de redirection **et** l'URL du pont OAuth. Sur Render, les mêmes
variables sont à ajouter dans *Environment*.

## 3. App Flutter

Le web n'a besoin d'aucun identifiant : tout est côté serveur. Seul le mobile
en demande, et il se passe au build :

```bash
# Web / PWA — aucun --dart-define nécessaire
flutter build web --release

# Android
flutter build appbundle --release \
  --dart-define=GOOGLE_WEB_CLIENT_ID=<client Web>.apps.googleusercontent.com

# iOS
flutter build ipa --release \
  --dart-define=GOOGLE_WEB_CLIENT_ID=<client Web>.apps.googleusercontent.com \
  --dart-define=GOOGLE_IOS_CLIENT_ID=<client iOS>.apps.googleusercontent.com
```

Sur mobile, tant qu'aucun `GOOGLE_WEB_CLIENT_ID` n'est fourni, le SDK ne
s'initialise pas et **le bouton Google est masqué** — l'app continue de
fonctionner en e-mail / mot de passe.

### Étape supplémentaire iOS

Ajouter le *reversed client ID* du client iOS dans `ios/Runner/Info.plist`, à
l'intérieur du tableau `CFBundleURLTypes` existant :

```xml
<dict>
  <key>CFBundleTypeRole</key><string>Editor</string>
  <key>CFBundleURLSchemes</key>
  <array>
    <string>com.googleusercontent.apps.XXXXXXXX-YYYY</string>
  </array>
</dict>
```

## Les endpoints

| Endpoint | Rôle |
|---|---|
| `GET /api/v1/oauth/google/start?redirect=<url app>` | **nouveau** — démarre le flux web. À appeler en navigation de premier niveau. Valide `redirect` contre la liste blanche des origines, puis renvoie vers Google. |
| `GET /api/v1/auth/callback/google` | better-auth — l'URI à déclarer chez Google. Crée la session et le compte à la première connexion. |
| `GET /api/v1/oauth/google/callback?redirect=<url app>` | **nouveau** — pont de retour. Convertit la session en jeton à usage unique et renvoie la PWA vers `<url app>#ott=…`. |
| `POST /api/v1/auth/one-time-token/verify` | better-auth (plugin) — la PWA échange le jeton contre sa session ; le token bearer arrive dans `set-auth-token`. |
| `POST /api/v1/auth/sign-in/social` | better-auth — voie mobile : `{"provider":"google","idToken":{"token":…}}`. |

### Parcours web (PWA)

```
PWA ──navigation──▶ /oauth/google/start ──302──▶ accounts.google.com
                                                        │
     /auth/callback/google ◀───────────────────────302──┘   (session créée)
              │
              └─302─▶ /oauth/google/callback ─302─▶ PWA#ott=…
                                                     │
                              POST /auth/one-time-token/verify
                                                     │
                                          set-auth-token → session
```

Deux détails qui comptent :

* le jeton voyage dans le **fragment** de l'URL : il n'est jamais envoyé au
  serveur qui héberge la PWA, ni écrit dans ses logs. L'app l'efface de la
  barre d'adresse dès qu'elle l'a lu ;
* `redirect` est validé contre les origines de `appOrigins` (`src/auth/auth.ts`).
  Une origine inconnue retombe sur l'origine par défaut — pas de redirection
  ouverte, donc pas de fuite de jeton.

### Parcours mobile

L'app ouvre la feuille de connexion native, récupère l'`id_token` et le poste
sur `/auth/sign-in/social`. Pas de navigateur, pas de pont.

## Tester la PWA en local

```bash
# 1. backend sur le port 3001, avec les identifiants Google
cd sahel_academy_backend && npm run start:dev

# 2. PWA sur le port 8080 (origine déjà autorisée côté backend)
cd sahel_academy_app && flutter run -d chrome --web-port 8080 \
  --dart-define=API_URL=http://localhost:3001/api/v1
```

Dans le client Google, ajouter `http://localhost:3001/api/v1/auth/callback/google`
aux URI de redirection. `BETTER_AUTH_URL` doit valoir `http://localhost:3001`.

Le portail d'installation PWA (`web/index.html`) laisse passer `localhost` : en
local, Flutter démarre directement au lieu d'afficher l'écran « Installe
l'app ».

## Comptes vérifiés par défaut

`emailVerified` passe à `true` à la création du compte (`databaseHooks` dans
`src/auth/auth.ts`, plus le défaut du schéma Prisma). Sans cela, better-auth
refuse de rattacher une identité Google à un compte e-mail existant tant que
l'e-mail local n'est pas vérifié.

Pour les comptes **déjà créés**, un rattrapage est nécessaire :

```bash
npx prisma migrate deploy     # applique la migration + le rattrapage
```

Si la base est synchronisée par `prisma db push` (c'est le cas de
`docker-entrypoint.sh`), le nouveau défaut est appliqué mais pas les lignes
existantes — lancer alors :

```bash
npm run db:verifier-comptes
```

Contrepartie assumée : l'app ne vérifiant aucune adresse e-mail, quelqu'un qui
enregistre un compte avec l'adresse d'un tiers récupérerait l'identité Google de
ce tiers à sa première connexion. Activer une vraie vérification d'e-mail
(Resend est déjà configuré dans `.env`) refermerait cette porte.

## Limite connue : PWA installée sur iOS

Le flux web quitte l'app le temps du passage chez Google. Sur une PWA installée
sur iOS, cette sortie peut basculer l'utilisateur dans Safari et lui faire
perdre le contexte de l'app. Le retour a été rendu robuste (`web/index.html`
démarre Flutter dès qu'il voit `#ott=`), mais le parcours reste plus fragile
qu'ailleurs. Android, desktop et navigateur classique ne sont pas concernés.
