-- État lu / masqué par utilisateur des notifications partagées.

-- CreateTable
CREATE TABLE "notifications_etats" (
    "notificationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lu" BOOLEAN NOT NULL DEFAULT false,
    "masquee" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_etats_pkey" PRIMARY KEY ("notificationId","userId")
);

-- CreateIndex
CREATE INDEX "notifications_etats_userId_idx" ON "notifications_etats"("userId");

-- AddForeignKey
ALTER TABLE "notifications_etats" ADD CONSTRAINT "notifications_etats_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications_etats" ADD CONSTRAINT "notifications_etats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
