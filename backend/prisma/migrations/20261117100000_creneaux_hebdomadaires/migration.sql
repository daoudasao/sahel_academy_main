-- Créneaux hebdomadaires : jour de la semaine + heure, sans date précise.
ALTER TABLE "creneaux" ALTER COLUMN "dateHeure" DROP NOT NULL;
ALTER TABLE "creneaux" ADD COLUMN "jourSemaine" INTEGER;
ALTER TABLE "creneaux" ADD COLUMN "heure" TEXT;
