-- AlterTable
ALTER TABLE "LicenseProduct" ADD COLUMN "apiKey" TEXT;

-- 为现有记录生成 apiKey
UPDATE "LicenseProduct" SET "apiKey" = hex(randomblob(16)) WHERE "apiKey" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "LicenseProduct_apiKey_key" ON "LicenseProduct"("apiKey");
