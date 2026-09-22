-- Rattrapage : objets créés jusqu'ici par `prisma db push` sans migration.
-- Sur une base déjà synchronisée par db push, marquer cette migration comme
-- appliquée (voir MIGRATIONS.md) au lieu de l'exécuter.

-- CreateEnum
CREATE TYPE "ExpediteurSupport" AS ENUM ('client', 'support');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Role" ADD VALUE 'COMPTABLE';
ALTER TYPE "Role" ADD VALUE 'SUPPORT';
ALTER TYPE "Role" ADD VALUE 'RESPONSABLE_PEDAGOGIQUE';
ALTER TYPE "Role" ADD VALUE 'COMMUNITY_MANAGER';

-- AlterTable
ALTER TABLE "accounts" ADD COLUMN     "issuer" TEXT;

-- AlterTable
ALTER TABLE "bourses" ADD COLUMN     "departementId" TEXT,
ADD COLUMN     "documentAdmissionNom" TEXT,
ADD COLUMN     "documentAdmissionUrl" TEXT,
ADD COLUMN     "messageAdmission" TEXT;

-- AlterTable
ALTER TABLE "formations" ADD COLUMN     "pourcentageFormateur" DOUBLE PRECISION NOT NULL DEFAULT 30;

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "documentNom" TEXT,
ADD COLUMN     "documentUrl" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "banExpires" TIMESTAMP(3),
ADD COLUMN     "banReason" TEXT,
ADD COLUMN     "banned" BOOLEAN DEFAULT false,
ADD COLUMN     "fcmToken" TEXT;

-- CreateTable
CREATE TABLE "demandes_inscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "formationId" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'en_attente',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "demandes_inscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classe_messages" (
    "id" TEXT NOT NULL,
    "formationId" TEXT NOT NULL,
    "auteurNom" TEXT NOT NULL,
    "auteurRole" TEXT NOT NULL DEFAULT 'Formateur',
    "contenu" TEXT NOT NULL,
    "documentNom" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "classe_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commentaires_classe" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "auteur" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'Élève',
    "contenu" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commentaires_classe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents_cours" (
    "id" TEXT NOT NULL,
    "formationId" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'PDF',
    "url" TEXT,
    "taille" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_cours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_messages" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expediteur" "ExpediteurSupport" NOT NULL,
    "contenu" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'texte',
    "audioUrl" TEXT,
    "documentUrl" TEXT,
    "documentNom" TEXT,
    "dureeSeconds" INTEGER,
    "lu" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "demandes_inscriptions_userId_formationId_key" ON "demandes_inscriptions"("userId", "formationId");

-- CreateIndex
CREATE INDEX "support_messages_userId_idx" ON "support_messages"("userId");

-- AddForeignKey
ALTER TABLE "demandes_inscriptions" ADD CONSTRAINT "demandes_inscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demandes_inscriptions" ADD CONSTRAINT "demandes_inscriptions_formationId_fkey" FOREIGN KEY ("formationId") REFERENCES "formations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classe_messages" ADD CONSTRAINT "classe_messages_formationId_fkey" FOREIGN KEY ("formationId") REFERENCES "formations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commentaires_classe" ADD CONSTRAINT "commentaires_classe_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "classe_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents_cours" ADD CONSTRAINT "documents_cours_formationId_fkey" FOREIGN KEY ("formationId") REFERENCES "formations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bourses" ADD CONSTRAINT "bourses_departementId_fkey" FOREIGN KEY ("departementId") REFERENCES "departements"("id") ON DELETE SET NULL ON UPDATE CASCADE;
