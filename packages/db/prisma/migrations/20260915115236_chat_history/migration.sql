-- AlterTable
ALTER TABLE "ActivitySession" ADD COLUMN     "focus" TEXT,
ADD COLUMN     "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "topicId" TEXT;

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "analysis" JSONB;

-- CreateIndex
CREATE INDEX "ActivitySession_userId_activityId_lastMessageAt_idx" ON "ActivitySession"("userId", "activityId", "lastMessageAt");
