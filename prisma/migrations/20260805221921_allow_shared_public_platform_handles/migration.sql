-- DropIndex
DROP INDEX "PlatformIdentity_platform_normalizedHandle_key";

-- CreateIndex
CREATE INDEX "PlatformIdentity_platform_normalizedHandle_idx" ON "PlatformIdentity"("platform", "normalizedHandle");
