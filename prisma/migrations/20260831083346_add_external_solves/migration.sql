-- CreateTable
CREATE TABLE "ExternalSolve" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "problemKey" TEXT NOT NULL,
    "solvedAt" TIMESTAMP(3),
    "source" TEXT NOT NULL DEFAULT 'RECENT_SUBMISSIONS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExternalSolve_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExternalSolve_userId_platform_idx" ON "ExternalSolve"("userId", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalSolve_userId_platform_problemKey_key" ON "ExternalSolve"("userId", "platform", "problemKey");

-- AddForeignKey
ALTER TABLE "ExternalSolve" ADD CONSTRAINT "ExternalSolve_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
