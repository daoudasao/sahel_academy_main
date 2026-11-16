-- Rendez-vous pris depuis l'app (visibles dans le dashboard), paramètres
-- globaux modifiables (numéro WhatsApp du service client) et localisation
-- GPS des centres.
-- CreateEnum
CREATE TYPE "StatutRendezVous" AS ENUM ('en_attente', 'confirme', 'annule', 'honore');

-- AlterTable
ALTER TABLE "centres" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "lienMaps" TEXT,
ADD COLUMN     "longitude" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "rendez_vous" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "centreId" TEXT NOT NULL,
    "creneauId" TEXT,
    "dateHeure" TIMESTAMP(3) NOT NULL,
    "motif" TEXT,
    "statut" "StatutRendezVous" NOT NULL DEFAULT 'en_attente',
    "noteAdmin" TEXT,
    "traiteParNom" TEXT,
    "traiteLe" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedById" TEXT,
    "deletedByNom" TEXT,

    CONSTRAINT "rendez_vous_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parametres" (
    "cle" TEXT NOT NULL,
    "valeur" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedByNom" TEXT,

    CONSTRAINT "parametres_pkey" PRIMARY KEY ("cle")
);

-- CreateIndex
CREATE INDEX "rendez_vous_deletedAt_idx" ON "rendez_vous"("deletedAt");

-- CreateIndex
CREATE INDEX "rendez_vous_statut_idx" ON "rendez_vous"("statut");

-- CreateIndex
CREATE INDEX "rendez_vous_userId_idx" ON "rendez_vous"("userId");

-- CreateIndex
CREATE INDEX "rendez_vous_dateHeure_idx" ON "rendez_vous"("dateHeure");

-- AddForeignKey
ALTER TABLE "rendez_vous" ADD CONSTRAINT "rendez_vous_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rendez_vous" ADD CONSTRAINT "rendez_vous_centreId_fkey" FOREIGN KEY ("centreId") REFERENCES "centres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rendez_vous" ADD CONSTRAINT "rendez_vous_creneauId_fkey" FOREIGN KEY ("creneauId") REFERENCES "creneaux"("id") ON DELETE SET NULL ON UPDATE CASCADE;

