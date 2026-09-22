# Déployer Sahel Academy sur Portainer (méthode « depuis GitHub »)

Portainer va **cloner chaque dépôt GitHub et fabriquer l'image tout seul**.
Tu n'as **aucune commande** à taper : tout se fait dans l'interface Portainer.

On crée **3 stacks** (un par application). Base de données : **Neon externe**.

| App | Dépôt GitHub | Branche | Port |
|---|---|---|---|
| 1. API (backend) | `daoudasao/sahel_academy_backend` | `main` | 3001 |
| 2. Site (admin + public) | `daoudasao/sahel_academy_admin` | `main` | 3000 |
| 3. PWA (Flutter web) | `daoudasao/sahel_academy` | `feat/web-pwa` | 8080 |

Chaque dépôt contient déjà un `docker-compose.yml` prêt à l'emploi (à la racine).

---

## ⚠️ À lire avant de commencer

- **Fabriquer les images consomme des ressources sur ton serveur.** Le build
  du **site** et surtout de la **PWA Flutter** demande plusieurs Go de RAM et
  télécharge beaucoup. Sur un petit VPS (1–2 Go), le build de la PWA peut
  échouer. Si c'est le cas → laisse la **PWA sur Firebase** (déjà en ligne) et
  ne déploie que le backend + le site.
- **Dépôts privés ?** Il faudra donner à Portainer un identifiant GitHub +
  un *token* (voir étape « Authentication » ci-dessous).
- Remplace partout `TON_SERVEUR` par l'adresse publique de ton serveur
  (son IP, ex. `http://203.0.113.10`, ou un domaine).

---

## Étape par étape (à répéter pour chaque app)

Dans Portainer : **Stacks → + Add stack**.

1. **Name** : un nom court, ex. `sahel-backend`.
2. **Build method** : choisis **Repository** (et non « Web editor »).
3. **Repository URL** :
   - backend : `https://github.com/daoudasao/sahel_academy_backend`
   - site : `https://github.com/daoudasao/sahel_academy_admin`
   - PWA : `https://github.com/daoudasao/sahel_academy`
4. **Repository reference** (la branche) :
   - backend : `refs/heads/main`
   - site : `refs/heads/main`
   - PWA : `refs/heads/feat/web-pwa`
5. **Compose path** : `docker-compose.yml`
6. **Authentication** : à activer **seulement si le dépôt est privé**
   (username GitHub + un *Personal Access Token* GitHub).
7. **Environment variables** : ajoute les variables ci-dessous (bouton
   *+ Add an environment variable*).
8. Clique **Deploy the stack**. Le premier build prend quelques minutes.

**Ordre conseillé : 1) backend, 2) site, 3) PWA.**

---

## Les variables à renseigner, par stack

### Stack 1 — backend
| Variable | Valeur |
|---|---|
| `DATABASE_URL` | ta chaîne Neon `postgresql://…?sslmode=require` |
| `BETTER_AUTH_URL` | `http://TON_SERVEUR:3001` |
| `BETTER_AUTH_SECRET` | un secret long et aléatoire |
| `FRONTEND_URL` | `http://TON_SERVEUR:8080` |
| `ADMIN_URL` | `http://TON_SERVEUR:3000` |
| `VERIF_URL` | `http://TON_SERVEUR:3000` |
| `WEB_URL` | `http://TON_SERVEUR:8080` |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | si tu utilises Google (sinon laisser vide) |
| `BUNNY_ACCESS_KEY`, `BUNNY_STORAGE_ZONE`, `BUNNY_STORAGE_ENDPOINT`, `BUNNY_CDN_DOMAIN` | si tu utilises les uploads |
| `FIREBASE_ADMIN_CREDENTIALS_BASE64` | si tu utilises les notifications push |

### Stack 2 — site
| Variable | Valeur |
|---|---|
| `NEXT_PUBLIC_API_URL` | `http://TON_SERVEUR:3001/api/v1` |
| `NEXT_PUBLIC_VERIF_URL` | `http://TON_SERVEUR:3000` |
| `DATABASE_URL` | ta chaîne Neon (même que le backend) |

### Stack 3 — PWA
| Variable | Valeur |
|---|---|
| `API_URL` | `http://TON_SERVEUR:3001/api/v1` |
| `FLUTTER_VERSION` | `3.44.4` (ta version) |
| `WEB_PUSH_VAPID_KEY` | (optionnel) clé Web Push |
| `GOOGLE_WEB_CLIENT_ID` | (optionnel) pour Google sur le web |

> Astuce : pour changer un port hôte, ajoute `BACKEND_PORT`, `WEB_PORT` ou
> `PWA_PORT` dans les variables du stack concerné.

---

## Après le déploiement

- API : `http://TON_SERVEUR:3001/api/v1`
- Site : `http://TON_SERVEUR:3000`
- PWA : `http://TON_SERVEUR:8080`

À vérifier (sinon connexion/CORS cassés) :
- Les mêmes URL publiques partout (les `NEXT_PUBLIC_API_URL` / `API_URL` doivent
  correspondre à `FRONTEND_URL`/`ADMIN_URL`/`VERIF_URL`/`WEB_URL` du backend).
- **Google Cloud** → *Authorized redirect URIs* : ajouter
  `http://TON_SERVEUR:3001/api/v1/auth/callback/google`.
- Le backend applique les **migrations Prisma** sur Neon au démarrage :
  fais une sauvegarde/branche Neon avant la première mise en prod.

## Mettre à jour une app plus tard
Le stack → **Pull and redeploy** : Portainer récupère le dernier code GitHub
et reconstruit l'image.

---

### Variante avancée (registre)
Si un jour tu ne veux plus builder sur le serveur, `deploy/portainer-stack.yml`
fournit la version « images pré-construites depuis un registre » (plus légère
pour le serveur, mais il faut build + push les images d'abord).
