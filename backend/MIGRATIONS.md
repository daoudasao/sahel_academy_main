# Migrations de base de données

Le schéma est désormais versionné **uniquement** par les migrations de
`prisma/migrations`. Le conteneur Docker les applique au démarrage avec
`prisma migrate deploy` (plus de `prisma db push`).

## Mettre la base de production en conformité (une seule fois)

Jusqu'ici la base de production a été tenue à jour avec `prisma db push`.
Deux migrations ont été ajoutées :

| Migration | Contenu | En production |
|---|---|---|
| `20260916100000_rattrapage_schema` | Tout ce que `db push` a déjà créé (tables classes, support, demandes, colonnes audio, nouveaux rôles…) | À **marquer comme appliquée** |
| `20260916100100_notifications_etats` | Nouvelle table `notifications_etats` (lu / masqué par utilisateur) | À **appliquer** |

Toutes les commandes ci-dessous se lancent depuis `sahel_academy_backend`,
avec `DATABASE_URL` pointant vers la base de production.

### 1. Constater l'état (lecture seule)

```bash
npx prisma migrate status
npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script
```

La seconde commande affiche le SQL qui manque à la production par rapport au
schéma actuel. Cas attendu : **uniquement** la création de `notifications_etats`.

### 2a. Cas attendu (seule `notifications_etats` manque)

```bash
# Si `migrate status` indique que les anciennes migrations ne sont pas
# enregistrées (base créée par db push), les marquer d'abord :
npx prisma migrate resolve --applied 20260821162820_init
npx prisma migrate resolve --applied 20260822212305_add_bourse_image_url
npx prisma migrate resolve --applied 20260908120000_email_verified_par_defaut

# Puis :
npx prisma migrate resolve --applied 20260916100000_rattrapage_schema
npx prisma migrate deploy        # applique notifications_etats
npx prisma migrate status        # doit indiquer « Database schema is up to date »
```

### 2b. Si le diff montre d'autres objets manquants

Ne pas marquer le rattrapage comme appliqué. Appliquer d'abord, à la main, le
SQL affiché par la commande de l'étape 1 **sans** la partie
`notifications_etats`, puis suivre l'étape 2a.

> Faire une sauvegarde (ou une branche Neon) avant toute opération.

## Faire évoluer le schéma ensuite

1. Modifier `prisma/schema.prisma`.
2. Générer la migration contre une base de développement (jamais la prod) :

   ```bash
   # base jetable pour la comparaison, par exemple :
   docker run -d --rm --name pg-shadow -e POSTGRES_PASSWORD=shadow \
     -p 127.0.0.1:55432:5432 postgres:16
   SHADOW_DATABASE_URL=postgresql://postgres:shadow@127.0.0.1:55432/postgres \
     npx prisma migrate dev --name description_courte
   ```

3. Committer le dossier de migration créé ; le déploiement l'appliquera.
