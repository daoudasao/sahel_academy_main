-- Plage de disponibilité hebdomadaire : de « heure » à « heureFin » (ex. 09:00 → 17:00).
ALTER TABLE "creneaux" ADD COLUMN "heureFin" TEXT;
