-- Les comptes sont consideres verifies des la creation : l'inscription ne passe
-- par aucune verification d'e-mail, et better-auth exige `emailVerified = true`
-- pour rattacher une identite Google a un compte e-mail existant.

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "emailVerified" SET DEFAULT true;

-- Rattrapage des comptes deja crees
UPDATE "users" SET "emailVerified" = true WHERE "emailVerified" = false;
