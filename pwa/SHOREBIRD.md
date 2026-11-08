# Shorebird — guide pour les agents IA et les développeurs

Shorebird = « code push » Flutter : on corrige le **code Dart** de l'app Android
sans repasser par la revue du Play Store. Lire ce fichier en entier **avant** de
construire une version, de toucher à `pubspec.yaml` ou de publier un patch.

## État de l'installation
- `shorebird init` fait le 2026-11-08. `shorebird.yaml` (à la racine de `pwa/`) contient
  l'`app_id` (public, versionné) et est déclaré dans les `assets:` de `pubspec.yaml`.
  **Ne jamais supprimer ces deux éléments** : sans eux l'app ne cherche plus de patchs.
- `auto_update` est actif (défaut) : l'app télécharge les patchs en arrière-plan au
  lancement, ils s'appliquent au **redémarrage suivant**. Aucun code Dart n'est nécessaire.
- Plateforme couverte : **Android**. iOS n'est pas configuré (nécessite un Mac,
  `shorebird release ios`).
- La version **107** déjà sur le Play Store a été construite SANS Shorebird :
  elle ne peut pas être patchée. La première version patchable sera la prochaine
  construite avec `shorebird release` (108 ou plus).

## Règle d'or
**Chaque version envoyée sur le Play Store doit être construite avec
`shorebird release`, jamais avec `flutter build` / `build_play_store.sh`.**
Sinon Shorebird ne connaît pas cette version → aucun patch possible pour elle.

Un patch est lié à UNE release précise (`version:` de `pubspec.yaml`, ex. `1.1.1+107`).
Quand une nouvelle version sort sur le store, c'est une nouvelle release : les patchs de
l'ancienne ne s'y appliquent pas et il n'y a aucun conflit. Mais alors **les correctifs
publiés en patch doivent déjà être dans le code source** (ils y sont : un patch est
toujours construit depuis le code du dépôt, donc commitez avant de patcher).

## Commandes (via le script)
```bash
./scripts/shorebird.sh release   # nouvelle version store → produit l'AAB à envoyer sur la Play Console
./scripts/shorebird.sh patch     # correctif Dart pour la release correspondant à pubspec.yaml
./scripts/shorebird.sh list      # releases connues de Shorebird
```
Le script demande confirmation, vérifie `android/key.properties` (signature) et passe les
`--dart-define` (API_URL, GOOGLE_WEB_CLIENT_ID). Ils sont définis **une seule fois** dans
`scripts/shorebird.sh` : `release` et `patch` DOIVENT avoir les mêmes defines, sinon le
patch est construit avec une autre config que la release et se comporte différemment.
(`build_play_store.sh` contient les mêmes valeurs : les garder synchronisées.)

## Procédure : nouvelle version store
1. Augmenter `version:` dans `pubspec.yaml` (le nombre après `+` doit toujours monter,
   Google refuse sinon).
2. Committer.
3. `./scripts/shorebird.sh release` puis envoyer l'AAB sur la Play Console.

## Procédure : correctif sans store
1. Corriger le code Dart, tester, **committer**.
2. **Ne pas changer `version:`** dans `pubspec.yaml` : il doit rester celui de la release
   publiée (sinon « release introuvable »).
3. `./scripts/shorebird.sh patch`.
4. Vérifier : `shorebird preview` ou lancer l'app deux fois sur un appareil de test.

## Ce qu'un patch NE PEUT PAS faire → vraie version store obligatoire
- Ajouter/mettre à jour un **plugin** avec code natif (Firebase, Google Sign-In, etc.)
- Changer `AndroidManifest.xml` (permissions, intent-filters), Gradle, icônes, `google-services.json`
- Modifier du code Kotlin/Java/Swift
- Changer la version de Flutter (le patch doit être construit avec la même version de
  Flutter que la release — ne pas faire `flutter upgrade` entre les deux ; Shorebird
  utilise son propre Flutter : voir `shorebird doctor`)
- Modifier les **assets** (images, polices…) : Shorebird ne patche que le code Dart.
En cas de doute : `shorebird patch` refuse ou avertit si le changement n'est pas patchable.

## Pièges connus
- Lancer `flutter build appbundle` directement pour une version publiée = version non patchable.
- Oublier de committer avant `patch` : le patch part du dossier de travail, pas de git.
- Patcher depuis une autre version de Flutter/Dart que la release → échec ou comportement différent.
- Le backend et l'app sont déployés séparément : un patch qui dépend d'une nouvelle route de
  l'API ne doit être publié qu'**après** le déploiement du backend.
- Ne pas mettre de secret dans le code : `shorebird.yaml` et les dart-define sont publics.

## Dépannage
- `shorebird doctor` : vérifie l'installation. `shorebird login` si la session a expiré.
- `shorebird releases list` : confirme que la version publiée existe bien côté Shorebird.
- Console : https://console.shorebird.dev (suivi des installations de patchs, rollback possible).
