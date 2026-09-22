-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'STAFF', 'ETUDIANT', 'FORMATEUR');

-- CreateEnum
CREATE TYPE "StatutAdmission" AS ENUM ('enAttente', 'admis', 'refuse');

-- CreateEnum
CREATE TYPE "StatutFormation" AS ENUM ('active', 'inactive', 'archive');

-- CreateEnum
CREATE TYPE "StatutBourse" AS ENUM ('ouverte', 'fermee', 'en_attente');

-- CreateEnum
CREATE TYPE "TypeNotification" AS ENUM ('actualite', 'paiement', 'classe', 'commentaire', 'systeme');

-- CreateEnum
CREATE TYPE "TypeMedia" AS ENUM ('photo', 'video', 'audio');

-- CreateEnum
CREATE TYPE "TypeChamp" AS ENUM ('texte', 'paragraphe', 'email', 'telephone', 'nombre', 'choix');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "telephone" TEXT,
    "image" TEXT,
    "role" "Role" NOT NULL DEFAULT 'ETUDIANT',
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verifications" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departements" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "centres" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "ville" TEXT NOT NULL,
    "adresse" TEXT,
    "telephone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "centres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creneaux" (
    "id" TEXT NOT NULL,
    "centreId" TEXT NOT NULL,
    "dateHeure" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "creneaux_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "formations" (
    "id" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "departementId" TEXT NOT NULL,
    "formateurId" TEXT,
    "prixInscription" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "prixMensualite" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dureeMois" INTEGER NOT NULL DEFAULT 1,
    "niveau" TEXT,
    "estBourse" BOOLEAN NOT NULL DEFAULT false,
    "imageUrl" TEXT,
    "statut" "StatutFormation" NOT NULL DEFAULT 'active',
    "datePublication" TIMESTAMP(3),
    "dateLimite" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "formations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "formationId" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'en_cours',
    "dateInscription" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "formateurs" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "email" TEXT,
    "telephone" TEXT,
    "specialite" TEXT,
    "salaireMensuel" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "formateurs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fiches_salaires" (
    "id" TEXT NOT NULL,
    "formateurId" TEXT NOT NULL,
    "mois" TEXT NOT NULL,
    "montantDu" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fiches_salaires_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "versements_salaires" (
    "id" TEXT NOT NULL,
    "ficheId" TEXT NOT NULL,
    "montant" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "versements_salaires_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bourses" (
    "id" TEXT NOT NULL,
    "formationId" TEXT,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "datePublication" TIMESTAMP(3) NOT NULL,
    "dateLimite" TIMESTAMP(3) NOT NULL,
    "statut" "StatutBourse" NOT NULL DEFAULT 'ouverte',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bourses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "champs_formulaires" (
    "id" TEXT NOT NULL,
    "bourseId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "TypeChamp" NOT NULL DEFAULT 'texte',
    "obligatoire" BOOLEAN NOT NULL DEFAULT false,
    "options" TEXT[],
    "aide" TEXT,
    "cle" TEXT,
    "ordre" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "champs_formulaires_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidatures" (
    "id" TEXT NOT NULL,
    "bourseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "statut" "StatutAdmission" NOT NULL DEFAULT 'enAttente',
    "dateDepot" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reponses" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidatures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "echeances" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "formationId" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "montantDu" DOUBLE PRECISION NOT NULL,
    "montantPaye" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dateEcheance" TIMESTAMP(3) NOT NULL,
    "datePaiement" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "echeances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paiements_historique" (
    "id" TEXT NOT NULL,
    "echeanceId" TEXT NOT NULL,
    "montant" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "paiements_historique_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posts" (
    "id" TEXT NOT NULL,
    "auteurId" TEXT,
    "auteurNom" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'Admin',
    "contenu" TEXT NOT NULL,
    "documentNom" TEXT,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medias" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "type" "TypeMedia" NOT NULL,
    "url" TEXT NOT NULL,
    "nom" TEXT,

    CONSTRAINT "medias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "actions_posts" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "cible" TEXT NOT NULL,

    CONSTRAINT "actions_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commentaires" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "parentId" TEXT,
    "auteur" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'Élève',
    "contenu" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commentaires_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "type" "TypeNotification" NOT NULL,
    "titre" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "lu" BOOLEAN NOT NULL DEFAULT false,
    "cible" TEXT NOT NULL DEFAULT 'global',
    "cibleId" TEXT,
    "cibleNom" TEXT,
    "envoyePar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_providerId_accountId_key" ON "accounts"("providerId", "accountId");

-- CreateIndex
CREATE UNIQUE INDEX "inscriptions_userId_formationId_key" ON "inscriptions"("userId", "formationId");

-- CreateIndex
CREATE UNIQUE INDEX "formateurs_email_key" ON "formateurs"("email");

-- CreateIndex
CREATE UNIQUE INDEX "formateurs_userId_key" ON "formateurs"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "candidatures_bourseId_userId_key" ON "candidatures"("bourseId", "userId");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creneaux" ADD CONSTRAINT "creneaux_centreId_fkey" FOREIGN KEY ("centreId") REFERENCES "centres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "formations" ADD CONSTRAINT "formations_departementId_fkey" FOREIGN KEY ("departementId") REFERENCES "departements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "formations" ADD CONSTRAINT "formations_formateurId_fkey" FOREIGN KEY ("formateurId") REFERENCES "formateurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscriptions" ADD CONSTRAINT "inscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscriptions" ADD CONSTRAINT "inscriptions_formationId_fkey" FOREIGN KEY ("formationId") REFERENCES "formations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "formateurs" ADD CONSTRAINT "formateurs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fiches_salaires" ADD CONSTRAINT "fiches_salaires_formateurId_fkey" FOREIGN KEY ("formateurId") REFERENCES "formateurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "versements_salaires" ADD CONSTRAINT "versements_salaires_ficheId_fkey" FOREIGN KEY ("ficheId") REFERENCES "fiches_salaires"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bourses" ADD CONSTRAINT "bourses_formationId_fkey" FOREIGN KEY ("formationId") REFERENCES "formations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "champs_formulaires" ADD CONSTRAINT "champs_formulaires_bourseId_fkey" FOREIGN KEY ("bourseId") REFERENCES "bourses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidatures" ADD CONSTRAINT "candidatures_bourseId_fkey" FOREIGN KEY ("bourseId") REFERENCES "bourses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidatures" ADD CONSTRAINT "candidatures_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "echeances" ADD CONSTRAINT "echeances_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "echeances" ADD CONSTRAINT "echeances_formationId_fkey" FOREIGN KEY ("formationId") REFERENCES "formations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paiements_historique" ADD CONSTRAINT "paiements_historique_echeanceId_fkey" FOREIGN KEY ("echeanceId") REFERENCES "echeances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medias" ADD CONSTRAINT "medias_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actions_posts" ADD CONSTRAINT "actions_posts_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commentaires" ADD CONSTRAINT "commentaires_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commentaires" ADD CONSTRAINT "commentaires_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "commentaires"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
