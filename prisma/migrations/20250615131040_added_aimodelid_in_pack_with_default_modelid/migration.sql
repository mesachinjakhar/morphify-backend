-- AlterTable
ALTER TABLE "Packs" ADD COLUMN     "aiModelId" TEXT NOT NULL DEFAULT '849a89f6-00d1-45e5-bd16-ee3a8f32597a';

-- AddForeignKey
ALTER TABLE "Packs" ADD CONSTRAINT "Packs_aiModelId_fkey" FOREIGN KEY ("aiModelId") REFERENCES "AiModel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
