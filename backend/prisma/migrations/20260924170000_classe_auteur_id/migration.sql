-- Compte de l'auteur des messages et commentaires de classe, pour le
-- prévenir des réponses (null pour les contenus antérieurs).
ALTER TABLE "classe_messages" ADD COLUMN "auteurId" TEXT;
ALTER TABLE "commentaires_classe" ADD COLUMN "auteurId" TEXT;
