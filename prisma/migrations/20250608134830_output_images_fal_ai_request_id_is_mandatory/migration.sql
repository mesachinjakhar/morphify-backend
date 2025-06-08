/*
  Warnings:

  - Made the column `falAiRequestId` on table `OutputImages` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "OutputImages" ALTER COLUMN "falAiRequestId" SET NOT NULL;
