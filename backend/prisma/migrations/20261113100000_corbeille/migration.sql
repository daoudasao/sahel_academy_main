-- Corbeille : suppression réversible des bourses, formations, centres,
-- départements et actualités.
ALTER TABLE "departements" ADD COLUMN "deletedAt" TIMESTAMP(3), ADD COLUMN "deletedById" TEXT, ADD COLUMN "deletedByNom" TEXT;
ALTER TABLE "centres"      ADD COLUMN "deletedAt" TIMESTAMP(3), ADD COLUMN "deletedById" TEXT, ADD COLUMN "deletedByNom" TEXT;
ALTER TABLE "formations"   ADD COLUMN "deletedAt" TIMESTAMP(3), ADD COLUMN "deletedById" TEXT, ADD COLUMN "deletedByNom" TEXT;
ALTER TABLE "bourses"      ADD COLUMN "deletedAt" TIMESTAMP(3), ADD COLUMN "deletedById" TEXT, ADD COLUMN "deletedByNom" TEXT;
ALTER TABLE "posts"        ADD COLUMN "deletedAt" TIMESTAMP(3), ADD COLUMN "deletedById" TEXT, ADD COLUMN "deletedByNom" TEXT;

CREATE INDEX "departements_deletedAt_idx" ON "departements"("deletedAt");
CREATE INDEX "centres_deletedAt_idx" ON "centres"("deletedAt");
CREATE INDEX "formations_deletedAt_idx" ON "formations"("deletedAt");
CREATE INDEX "bourses_deletedAt_idx" ON "bourses"("deletedAt");
CREATE INDEX "posts_deletedAt_idx" ON "posts"("deletedAt");
