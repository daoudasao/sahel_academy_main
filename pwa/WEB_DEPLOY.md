# Sahel Academy — Version Web (PWA Flutter)

La version web est **la même app Flutter compilée pour le navigateur** (`flutter build web`).
Aucune réécriture : rendu identique, toutes les fonctionnalités présentes.

## 1. Prérequis backend (une seule fois) ⚠️

Le navigateur applique le **CORS** (contrairement aux apps natives). Le backend
NestJS (`../sahel_academy_backend`) a été mis à jour pour autoriser l'origine web :

- `src/main.ts` : origine `WEB_URL` + `localhost:8080` ajoutées, et
  `exposedHeaders: ['set-auth-token']` (indispensable pour que le navigateur lise
  le token de session better-auth).
- `src/auth/auth.ts` : mêmes origines dans `trustedOrigins`.

**À faire :**
1. Sur Render, ajouter la variable d'environnement
   `WEB_URL = https://<url-de-la-pwa>` (ex. `https://sahel-academy.vercel.app`).
2. **Redéployer le backend** sur Render.

Sans ça, la PWA en production sera bloquée par le CORS.

## 2. Build de production

```bash
flutter build web --release \
  --dart-define=API_URL=https://sahel-academy-backend.onrender.com/api/v1 \
  --dart-define=WEB_PUSH_VAPID_KEY=<clé-publique-VAPID>
```

Le résultat est le dossier statique `build/web/`.

- `API_URL` : l'API backend.
- `WEB_PUSH_VAPID_KEY` (optionnel) : clé publique Web Push
  (**Firebase Console → Paramètres du projet → Cloud Messaging → Certificats
  push Web → Paire de clés**). Sans elle, le push web est simplement désactivé
  (le reste marche).

> Si la PWA n'est pas servie à la racine du domaine, ajouter
> `--base-href=/mon-chemin/`.

## 3. Déploiement (dossier statique `build/web`)

### Vercel (recommandé — déjà utilisé pour ce projet)
- **Projet séparé** pointant sur ce dépôt, ou déploiement du dossier `build/web`.
- Build command : la commande ci-dessus (nécessite Flutter dans l'environnement de
  build) — sinon builder en local/CI et déployer `build/web` en statique
  (`vercel deploy --prod build/web`).
- Output directory : `build/web`.
- `web/vercel.json` (copié dans `build/web` au build) fournit les réécritures SPA.

### Firebase Hosting
```bash
# firebase.json > hosting.public = "build/web", rewrites vers /index.html
firebase deploy --only hosting
```

### Netlify / Render Static / autre
- Publier le dossier `build/web`.
- Ajouter une règle « toutes les routes → /index.html » (SPA fallback).

## 4. Test local

```bash
flutter build web --dart-define=API_URL=http://localhost:3001/api/v1
python3 -m http.server 8080 --directory build/web
# puis ouvrir http://localhost:8080  (backend lancé via `npm run start:dev`)
```

## Notes

- **URLs propres (activées)** : `usePathUrlStrategy()` est activé sur web
  (`main.dart`) → URLs sans `#` (`/actualite`, `/bienvenue`…) et deep links web.
  ⚠️ **Le fallback SPA est donc requis** : toute route doit renvoyer
  `index.html`, sinon un rafraîchissement sur `/actualite` renvoie 404.
  - Vercel : géré par `web/vercel.json` (copié dans `build/web`).
  - Firebase/Netlify/Render : ajouter la règle « /* → /index.html ».
  - En test local, `python3 -m http.server` **ne gère pas** ce fallback :
    la navigation dans l'app marche, mais un refresh sur une sous-route fait 404.
- **Push web (Firebase Cloud Messaging)** : `web/firebase-messaging-sw.js` gère
  les notifications en arrière-plan. Nécessite `WEB_PUSH_VAPID_KEY` au build
  (voir §2). Sans clé, le push web est désactivé proprement.
- **Fonctions natives adaptées au web** :
  - Téléchargement de documents → ouverture dans un nouvel onglet.
  - Notifications locales natives (flutter_local_notifications) → non utilisées
    sur web (remplacées par le service worker FCM).
  - Enregistrement vocal du chat support → enregistre mais n'envoie pas encore
    sur web (amélioration future : lire les octets du blob).
- **Temps réel (Socket.io)** : fonctionne (les gateways autorisent `origin: '*'`).
