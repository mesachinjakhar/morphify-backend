/*
  Warnings:

  - Made the column `triggerWord` on table `Model` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Model" ALTER COLUMN "triggerWord" SET NOT NULL;
