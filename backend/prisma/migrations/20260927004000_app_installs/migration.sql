-- CreateTable
CREATE TABLE "app_installs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceFingerprint" TEXT NOT NULL,
    "plateforme" TEXT NOT NULL,
    "typeInstallation" TEXT NOT NULL,
    "appVersion" TEXT,
    "deviceModel" TEXT,
    "dernierAcces" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_installs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "app_installs_plateforme_idx" ON "app_installs"("plateforme");

-- CreateIndex
CREATE INDEX "app_installs_typeInstallation_idx" ON "app_installs"("typeInstallation");

-- CreateIndex
CREATE INDEX "app_installs_dernierAcces_idx" ON "app_installs"("dernierAcces");

-- CreateIndex
CREATE UNIQUE INDEX "app_installs_userId_deviceFingerprint_key" ON "app_installs"("userId", "deviceFingerprint");

-- AddForeignKey
ALTER TABLE "app_installs" ADD CONSTRAINT "app_installs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
