-- CreateTable
CREATE TABLE "AiSettings" (
    "userId" TEXT NOT NULL,
    "anthropicApiKey" TEXT,
    "openaiApiKey" TEXT,
    "openaiBaseUrl" TEXT,
    "tutorModel" TEXT,
    "graderModel" TEXT,
    "generatorModel" TEXT,
    "voiceProvider" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiSettings_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "AiSettings" ADD CONSTRAINT "AiSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
