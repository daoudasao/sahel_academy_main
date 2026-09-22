# Sahel Academy — monorepo

Trois applications dans un seul dépôt, déployées ensemble via **Portainer**.

```
├── docker-compose.yml   ← le stack (3 services)
├── backend/             ← API NestJS (port 3001)
├── web/                 ← Site Next.js : dashboard admin + pages publiques (port 3000)
└── pwa/                 ← Application Flutter, version web/PWA (port 8080)
```

Base de données : **Neon** (externe). Aucun conteneur Postgres ici.

## Déploiement Portainer (méthode « Repository »)

1. Portainer → **Stacks → + Add stack**, nom `sahel-academy`.
2. **Build method : Repository**.
3. **Repository URL** : l'URL GitHub de CE dépôt.
4. **Repository reference** : `refs/heads/main`.
5. **Compose path** : `docker-compose.yml`.
6. (Dépôt privé → activer **Authentication** : identifiant GitHub + token.)
7. **Environment variables** : voir le tableau ci-dessous.
8. **Deploy the stack**.

Accès ensuite : API `:3001`, site `:3000`, PWA `:8080`
(remplacer par l'IP/domaine du serveur).

## Variables d'environnement du stack

| Variable | Rôle |
|---|---|
| `DATABASE_URL` | chaîne Neon `postgresql://…?sslmode=require` |
| `BETTER_AUTH_URL` | URL publique du backend, ex. `http://TON_SERVEUR:3001` |
| `BETTER_AUTH_SECRET` | secret long aléatoire |
| `FRONTEND_URL` / `WEB_URL` | `http://TON_SERVEUR:8080` (PWA) |
| `ADMIN_URL` / `VERIF_URL` | `http://TON_SERVEUR:3000` (site) |
| `NEXT_PUBLIC_API_URL` | `http://TON_SERVEUR:3001/api/v1` (figée au build du site) |
| `NEXT_PUBLIC_VERIF_URL` | `http://TON_SERVEUR:3000` |
| `API_URL` | `http://TON_SERVEUR:3001/api/v1` (figée au build de la PWA) |
| `FLUTTER_VERSION` | `3.44.4` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | OAuth Google (optionnel) |
| `BUNNY_ACCESS_KEY` / `BUNNY_STORAGE_ZONE` / `BUNNY_STORAGE_ENDPOINT` / `BUNNY_CDN_DOMAIN` | uploads (optionnel) |
| `FIREBASE_ADMIN_CREDENTIALS_BASE64` | push (optionnel) |
| `BACKEND_PORT` / `WEB_PORT` / `PWA_PORT` | changer les ports hôte (optionnel) |

## Notes importantes
- Les `NEXT_PUBLIC_*` (site) et `API_URL` (PWA) sont **figées à la construction** :
  elles doivent pointer vers les URL publiques du serveur.
- **Google Cloud** → *Authorized redirect URIs* : ajouter
  `http://TON_SERVEUR:3001/api/v1/auth/callback/google`.
- Le backend applique les **migrations Prisma** sur Neon au démarrage (sauvegarde
  recommandée avant la 1re mise en prod).
- ⚠️ Construire la **PWA Flutter** est gourmand (RAM/temps). Sur un petit serveur,
  ce build peut échouer : dans ce cas, retire le service `pwa` du compose et
  garde la PWA sur Firebase.
