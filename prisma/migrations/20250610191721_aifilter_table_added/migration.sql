/*
  Warnings:

  - You are about to drop the column `falAiRequestId` on the `FilteredImages` table. All the data in the column will be lost.
  - Added the required column `aiFilterId` to the `FilteredImages` table without a default value. This is not possible if the table is not empty.
  - Added the required column `providerRequestId` to the `FilteredImages` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "FilteredImages" DROP COLUMN "falAiRequestId",
ADD COLUMN     "aiFilterId" TEXT NOT NULL,
ADD COLUMN     "providerRequestId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "AiFilters" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "description" TEXT,
    "model" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "beforeImage" TEXT NOT NULL,
    "afterImage" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiFilters_pkey" PRIMARY KEY ("id")
);
