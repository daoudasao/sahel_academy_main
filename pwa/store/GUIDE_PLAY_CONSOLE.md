# Publier Sahel Academy sur Google Play — pas à pas

Tout se fait sur https://play.google.com/console avec le compte développeur de l'entreprise.

Fichiers prêts dans ce dossier (`pwa/store/`) :

| Fichier | Où il va |
|---|---|
| `icone-512.png` | Fiche du Store → Icône de l'application |
| `banniere-1024x500.png` | Fiche du Store → Image de présentation |
| `../build/app/outputs/bundle/release/app-release.aab` | Test interne → Nouvelle version |

---

## Avant de commencer : 2 choses à préparer

1. **Un compte de test pour Google.** Les vérificateurs de Google doivent pouvoir se
   connecter à l'app. Crée dans l'app un compte étudiant, par exemple
   `test.playstore@…` avec un mot de passe simple, et garde-le actif.
   Idéalement : inscrit à une formation, pour qu'ils voient les classes et les paiements.
2. **Une adresse e-mail de contact** qui sera affichée publiquement sur le Store
   (obligatoire), par exemple `contact@sahel-academy.com`.

---

## Étape 1 — Créer l'application

**Accueil → Créer une application**

| Champ | Réponse |
|---|---|
| Nom de l'application | `Sahel Academy` |
| Langue par défaut | `Français (France) – fr-FR` |
| Application ou jeu | Application |
| Gratuite ou payante | Gratuite ⚠️ (on ne peut plus la rendre payante ensuite) |
| Déclarations | cocher les 2 cases (règles du programme + lois export US) |

---

## Étape 2 — Test interne (en premier, avant tout le reste)

Le test interne ne passe pas par la vérification de Google : l'app est disponible en
quelques minutes pour jusqu'à 100 testeurs.

**Tester et publier → Tests → Test interne**

1. Onglet **Testeurs** → **Créer une liste d'adresses e-mail** → nom : `Équipe Sahel`
   → ajouter les adresses **Gmail** des testeurs (toi compris) → Enregistrer, puis cocher la liste.
2. Onglet **Versions** → **Créer une version**.
3. **Signature d'application Google Play** : laisser le choix par défaut
   (« Utiliser une clé de signature générée par Google ») → **Continuer**.
   Google garde la clé de signature finale ; ta clé `sahel-academy-upload.jks` sert
   seulement à prouver que c'est bien toi qui envoies les mises à jour.
4. **Importer** le fichier `app-release.aab`.
5. Nom de la version : laisser la valeur proposée (`103 (1.1.0)`).
6. Notes de version :
   ```
   <fr-FR>
   Première version de test de l'application Sahel Academy.
   </fr-FR>
   ```
7. **Suivant** → **Enregistrer et publier**.
8. De retour dans l'onglet **Testeurs**, copie le **lien « Rejoindre sur le Web »** et
   envoie-le aux testeurs. Ils l'ouvrent avec leur compte Gmail, acceptent, puis
   installent l'app depuis le Play Store.

### ⚠️ Juste après : envoyer les empreintes à Claude

**Tester et publier → Configuration → Intégrité de l'application → onglet Signature de l'application**

Copie les deux lignes du bloc **« Certificat de la clé de signature d'application »** :
- `Empreinte du certificat SHA-1`
- `Empreinte du certificat SHA-256`

Sans elles, **la connexion Google ne fonctionnera pas** dans l'app installée depuis le
Play Store, et les liens `sahel-academy.com/app/...` ne s'ouvriront pas dans l'app.

---

## Étape 3 — « Configurer votre application » (Tableau de bord)

Chaque rubrique ci-dessous se trouve dans **Surveiller et améliorer → Règles → Contenu de l'application**
(ou directement dans la liste du Tableau de bord).

### Politique de confidentialité
`https://sahel-academy.com/confidentialite`

### Accès aux applications
« Tout ou partie des fonctionnalités de l'application sont soumises à des restrictions »
→ **Ajouter des instructions** :
- Nom : `Compte étudiant de test`
- Nom d'utilisateur : l'e-mail du compte de test
- Mot de passe : son mot de passe
- Instructions : `Sur l'écran d'accueil, touchez « Se connecter », puis saisissez l'e-mail et le mot de passe ci-dessus.`

### Annonces
**Non**, mon application ne contient pas d'annonces.

### Classification du contenu
- E-mail : l'e-mail de contact
- Catégorie : **Référence, actualités ou éducation**
- Violence, sexualité, langage, drogues, jeux d'argent : **Non** partout
- Les utilisateurs peuvent-ils interagir ou échanger du contenu ? **Oui**
  (messages de classe, commentaires, support)
- Partage de la position avec d'autres utilisateurs : **Non**
- Achats numériques : **Non**
- Contenu généré par l'utilisateur modéré : **Oui** (l'équipe modère les commentaires depuis le back-office)

### Public cible et contenu
- Tranches d'âge : **16-17 ans** et **18 ans et plus**
  (ne pas cocher en dessous de 13 ans : cela ajoute les règles « Familles »)
- L'app pourrait-elle attirer des enfants ? **Non**

### Applications d'actualités
**Non** (le fil d'actualité ne concerne que l'école, ce n'est pas une app d'actualités).

### Fonctionnalités financières
**Mon application ne propose aucune fonctionnalité financière**
(elle affiche des échéances, mais aucun paiement ne se fait dans l'app).

### Applications de santé
**Non**.

### Application gouvernementale
**Non**.

### Suppression des données (dans « Sécurité des données »)
URL : `https://sahel-academy.com/suppression-compte`

### Sécurité des données
Page 1 :
- L'application collecte-t-elle des données utilisateur ? **Oui**
- Toutes les données sont-elles chiffrées en transit ? **Oui**
- Méthodes de création de compte : **Nom d'utilisateur et mot de passe** + **OAuth (Google)**
- URL de suppression du compte : `https://sahel-academy.com/suppression-compte`
- Permettez-vous de supprimer des données sans supprimer le compte ? **Non**

Page 2 — cocher ces types de données :

| Catégorie | Type | Collectée | Partagée | Obligatoire ? | Finalités |
|---|---|---|---|---|---|
| Informations personnelles | Nom | Oui | Non | Obligatoire | Fonctionnalité de l'app, Gestion du compte |
| Informations personnelles | Adresse e-mail | Oui | Non | Obligatoire | Fonctionnalité de l'app, Gestion du compte, Communications |
| Informations personnelles | Numéro de téléphone | Oui | Non | Obligatoire | Fonctionnalité de l'app, Gestion du compte, Communications |
| Informations personnelles | Autres informations | Oui | Non | Facultative | Fonctionnalité de l'app (réponses aux formulaires de bourse) |
| Messages | Autres messages dans l'application | Oui | Non | Facultative | Fonctionnalité de l'app |
| Audio | Enregistrements vocaux ou sonores | Oui | Non | Facultative | Fonctionnalité de l'app (messages vocaux au support) |
| Photos et vidéos | Photos | Oui | Non | Facultative | Fonctionnalité de l'app (photo de profil) |
| Fichiers et documents | Fichiers et documents | Oui | Non | Facultative | Fonctionnalité de l'app (documents de cours) |
| Identifiants de l'appareil ou autres | ID de l'appareil ou autres | Oui | Non | Obligatoire | Fonctionnalité de l'app (notifications) |

Pour chaque type : données **non** traitées de façon éphémère.
« Partagée » = **Non** partout : Firebase, Google et l'hébergeur sont des prestataires
qui travaillent pour vous, ce n'est pas du partage au sens de Google.

---

## Étape 4 — Fiche principale du Store

**Développer l'audience → Présence sur le Play Store → Fiche principale**

**Nom de l'application** (30 caractères max)
```
Sahel Academy
```

**Description courte** (80 caractères max)
```
Bourses d'études, formations certifiantes et suivi de tes cours au même endroit.
```

**Description complète**
```
Sahel Academy t'accompagne de ta candidature jusqu'à ton certificat.

🎓 BOURSES D'ÉTUDES
• Découvre les bourses ouvertes et leurs conditions
• Postule directement depuis l'application
• Suis l'état de ta candidature et reçois les résultats en notification

📚 FORMATIONS CERTIFIANTES
• Parcours le catalogue : anglais, réseau informatique et bien d'autres
• Demande ton inscription en quelques secondes
• Consulte les centres de formation et leurs horaires

👩🏽‍🏫 TA CLASSE DANS TA POCHE
• Échange avec ton formateur et les autres apprenants
• Télécharge les documents de cours
• Ne rate aucune annonce grâce aux notifications

💳 PAIEMENTS
• Consulte tes échéances et l'historique de tes versements

📰 ACTUALITÉS
• Reste informé des nouvelles bourses, des résultats et de la vie de l'école

🛟 SUPPORT
• Pose tes questions à l'équipe directement depuis l'application

Connexion simple par e-mail ou avec ton compte Google.
Tu peux supprimer ton compte à tout moment depuis Profil → Paramètres.
```

**Éléments graphiques**
- Icône : `icone-512.png`
- Image de présentation : `banniere-1024x500.png`
- **Captures d'écran de téléphone : au moins 2, idéalement 4 à 8.**
  Fais-les sur ton téléphone avec l'app installée via le test interne, avec de vraies
  données : accueil, liste des bourses, fiche d'une bourse, formations, classe, profil.
  Format portrait, sans barre de notifications gênante.

**Catégorie et coordonnées** (Présence sur le Play Store → Paramètres de la fiche)
- Type : Application · Catégorie : **Éducation**
- Tags : Éducation, Apprentissage
- E-mail : l'e-mail de contact
- Site web : `https://sahel-academy.com`

---

## Étape 5 — Passage en production

Quand les testeurs internes ont validé l'app :

1. **Tester et publier → Production → Pays/régions** : ajouter les pays visés
   (Mali, Sénégal, Burkina Faso, Niger, Côte d'Ivoire, Guinée, France…).
2. **Test interne → Versions → « Promouvoir la version » → Production**
   (pas besoin de réimporter le fichier).
3. **Envoyer pour examen**. Première vérification par Google : de quelques jours à
   une semaine environ.

> Compte **organisation** : Google n'impose pas le test fermé de 12 testeurs pendant
> 14 jours, qui vise les comptes **personnels** récents. Si la console te le demande
> quand même, fais d'abord un **Test fermé** avec au moins 12 testeurs pendant 14 jours.

---

## Pour les mises à jour suivantes

1. Dans `pubspec.yaml`, augmente la version : `1.1.0+103` → `1.1.1+104`
   (le nombre après le `+` doit **toujours** augmenter).
2. Lance `./scripts/build_play_store.sh` depuis le dossier `pwa`.
3. Importe le nouveau `app-release.aab` en test interne, puis promeus-le en production.
