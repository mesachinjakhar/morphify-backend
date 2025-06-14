/*
  Warnings:

  - You are about to drop the `FilteredImages` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "FilteredImages";

-- CreateTable
CREATE TABLE "GeneratedImages" (
    "id" TEXT NOT NULL,
    "aiFilterId" TEXT,
    "packId" TEXT,
    "userModelId" TEXT,
    "prompt" TEXT,
    "userId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL DEFAULT '',
    "providerRequestId" TEXT,
    "status" "OutputImageStatusEnum" NOT NULL DEFAULT 'PENDING',
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeneratedImages_pkey" PRIMARY KEY ("id")
);
