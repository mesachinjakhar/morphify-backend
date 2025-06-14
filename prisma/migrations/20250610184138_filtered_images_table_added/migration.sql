-- CreateTable
CREATE TABLE "FilteredImages" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL DEFAULT '',
    "falAiRequestId" TEXT NOT NULL,
    "status" "OutputImageStatusEnum" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FilteredImages_pkey" PRIMARY KEY ("id")
);
