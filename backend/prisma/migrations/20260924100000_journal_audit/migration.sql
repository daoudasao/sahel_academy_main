-- Journal d'audit + rôle SUPER_ADMIN.
-- Écrite de façon idempotente, comme les migrations précédentes.

-- AlterEnum : nouveau rôle au-dessus d'ADMIN.
-- (Postgres ≥ 12 accepte ADD VALUE dans une transaction tant que la valeur
-- n'est pas utilisée dans cette même transaction — c'est le cas ici.)
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';

-- CreateTable
CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "userNom" TEXT,
    "userEmail" TEXT,
    "userRole" TEXT,
    "action" TEXT NOT NULL,
    "ressource" TEXT NOT NULL,
    "ressourceId" TEXT,
    "libelle" TEXT,
    "methode" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "statut" INTEGER NOT NULL,
    "succes" BOOLEAN NOT NULL DEFAULT true,
    "details" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "audit_logs_ressource_idx" ON "audit_logs"("ressource");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "audit_logs_action_idx" ON "audit_logs"("action");
