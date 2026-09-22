-- Alertes modales déjà vues / fermées par chaque utilisateur.
-- Écrite de façon idempotente : la table a pu être créée en production
-- par un `db push` avant l'ajout de cette migration.

-- CreateTable
CREATE TABLE IF NOT EXISTS "alertes_vues" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "alerteId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alertes_vues_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "alertes_vues_userId_idx" ON "alertes_vues"("userId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "alertes_vues_userId_alerteId_key" ON "alertes_vues"("userId", "alerteId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'alertes_vues_userId_fkey'
  ) THEN
    ALTER TABLE "alertes_vues" ADD CONSTRAINT "alertes_vues_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
