-- AlterTable
ALTER TABLE "User" ADD COLUMN     "memoryEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "LearnerMemory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fact" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'chat',
    "sessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearnerMemory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LearnerMemory_userId_updatedAt_idx" ON "LearnerMemory"("userId", "updatedAt");

-- AddForeignKey
ALTER TABLE "LearnerMemory" ADD CONSTRAINT "LearnerMemory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
