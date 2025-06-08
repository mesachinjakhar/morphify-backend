/*
  Warnings:

  - Added the required column `description` to the `Packs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tumbnail` to the `Packs` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Packs" ADD COLUMN     "description" TEXT NOT NULL,
ADD COLUMN     "gallary" TEXT[],
ADD COLUMN     "tumbnail" TEXT NOT NULL;
