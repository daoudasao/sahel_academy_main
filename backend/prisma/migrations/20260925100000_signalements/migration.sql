-- Signalement de messages et commentaires à la modération (exigence des
-- stores pour les contenus publiés par les utilisateurs).

-- CreateEnum
CREATE TYPE "TypeSignalement" AS ENUM ('message_classe', 'commentaire_classe', 'commentaire_post');

-- CreateEnum
CREATE TYPE "MotifSignalement" AS ENUM ('spam', 'harcelement', 'contenu_inapproprie', 'discours_haineux', 'fausse_information', 'autre');

-- CreateEnum
CREATE TYPE "StatutSignalement" AS ENUM ('en_attente', 'traite', 'rejete');

-- Compte de l'auteur d'un commentaire d'actualité (null pour les anciens).
ALTER TABLE "commentaires" ADD COLUMN "auteurId" TEXT;

-- CreateTable
CREATE TABLE "signalements" (
    "id" TEXT NOT NULL,
    "type" "TypeSignalement" NOT NULL,
    "contenuId" TEXT NOT NULL,
    "motif" "MotifSignalement" NOT NULL,
    "details" TEXT,
    "signaleParId" TEXT NOT NULL,
    "auteurId" TEXT,
    "auteurNom" TEXT NOT NULL,
    "auteurRole" TEXT,
    "contenu" TEXT NOT NULL,
    "formationId" TEXT,
    "postId" TEXT,
    "statut" "StatutSignalement" NOT NULL DEFAULT 'en_attente',
    "traiteParNom" TEXT,
    "traiteLe" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "signalements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "signalements_statut_idx" ON "signalements"("statut");

-- CreateIndex
CREATE INDEX "signalements_type_contenuId_idx" ON "signalements"("type", "contenuId");

-- CreateIndex
CREATE UNIQUE INDEX "signalements_type_contenuId_signaleParId_key" ON "signalements"("type", "contenuId", "signaleParId");

-- AddForeignKey
ALTER TABLE "signalements" ADD CONSTRAINT "signalements_signaleParId_fkey" FOREIGN KEY ("signaleParId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
