/*
  Warnings:

  - You are about to drop the `AiFilters` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TrainingImages` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('DEDUCTION', 'TOPUP', 'REFUND');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('COMPLETED', 'FAILED', 'REFUNDED');

-- DropForeignKey
ALTER TABLE "TrainingImages" DROP CONSTRAINT "TrainingImages_modelId_fkey";

-- AlterTable
ALTER TABLE "FilteredImages" ALTER COLUMN "providerRequestId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "mstarsBalance" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE "AiFilters";

-- DropTable
DROP TABLE "TrainingImages";

-- CreateTable
CREATE TABLE "AiProvider" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiModel" (
    "id" TEXT NOT NULL,
    "aiProviderId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "baseCostPerCall" DOUBLE PRECISION NOT NULL,
    "mstarsCostPerCall" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MstarTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "aiFilterId" TEXT,
    "aiModelId" TEXT NOT NULL,
    "mstarsSpent" DOUBLE PRECISION NOT NULL,
    "realCost" DOUBLE PRECISION,
    "transactionType" "TransactionType" NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'COMPLETED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MstarTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiFilter" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "beforeImage" TEXT,
    "afterImage" TEXT,
    "aiModelId" TEXT NOT NULL,
    "additionalCost" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiFilter_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AiModel" ADD CONSTRAINT "AiModel_aiProviderId_fkey" FOREIGN KEY ("aiProviderId") REFERENCES "AiProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MstarTransaction" ADD CONSTRAINT "MstarTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MstarTransaction" ADD CONSTRAINT "MstarTransaction_aiFilterId_fkey" FOREIGN KEY ("aiFilterId") REFERENCES "AiFilter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MstarTransaction" ADD CONSTRAINT "MstarTransaction_aiModelId_fkey" FOREIGN KEY ("aiModelId") REFERENCES "AiModel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiFilter" ADD CONSTRAINT "AiFilter_aiModelId_fkey" FOREIGN KEY ("aiModelId") REFERENCES "AiModel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
