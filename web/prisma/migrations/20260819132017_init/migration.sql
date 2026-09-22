-- CreateTable
CREATE TABLE "Candidat" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "telephoneBrut" TEXT NOT NULL,
    "email" TEXT,
    "niveauEtude" TEXT,
    "situation" TEXT,
    "niveauAnglais" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'admis',
    "horodateur" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Candidat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Candidat_telephone_key" ON "Candidat"("telephone");
