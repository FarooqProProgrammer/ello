-- AlterTable
ALTER TABLE "LearnerMemory" ADD COLUMN     "messageId" TEXT;

-- CreateIndex
CREATE INDEX "LearnerMemory_userId_messageId_idx" ON "LearnerMemory"("userId", "messageId");
