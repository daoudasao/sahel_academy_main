-- Écran de l'app ouvert au clic sur une notification (null = informative).
ALTER TABLE "notifications" ADD COLUMN "route" TEXT;
