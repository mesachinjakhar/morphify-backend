/*
  Warnings:

  - You are about to drop the column `afterImage` on the `AiFilter` table. All the data in the column will be lost.
  - You are about to drop the column `beforeImage` on the `AiFilter` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "AiFilter" DROP COLUMN "afterImage",
DROP COLUMN "beforeImage";

-- CreateTable
CREATE TABLE "AiFilterShowCase" (
    "id" TEXT NOT NULL,
    "aiFilterId" TEXT NOT NULL,

    CONSTRAINT "AiFilterShowCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShowcaseImagePair" (
    "id" TEXT NOT NULL,
    "beforeImage" TEXT NOT NULL,
    "afterImage" TEXT NOT NULL,
    "showcaseId" TEXT NOT NULL,

    CONSTRAINT "ShowcaseImagePair_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AiFilterShowCase_aiFilterId_key" ON "AiFilterShowCase"("aiFilterId");

-- AddForeignKey
ALTER TABLE "AiFilterShowCase" ADD CONSTRAINT "AiFilterShowCase_aiFilterId_fkey" FOREIGN KEY ("aiFilterId") REFERENCES "AiFilter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShowcaseImagePair" ADD CONSTRAINT "ShowcaseImagePair_showcaseId_fkey" FOREIGN KEY ("showcaseId") REFERENCES "AiFilterShowCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
