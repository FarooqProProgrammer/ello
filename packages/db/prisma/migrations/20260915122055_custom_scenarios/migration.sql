-- CreateTable
CREATE TABLE "CustomScenario" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomScenario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomScenario_userId_updatedAt_idx" ON "CustomScenario"("userId", "updatedAt");

-- AddForeignKey
ALTER TABLE "CustomScenario" ADD CONSTRAINT "CustomScenario_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
