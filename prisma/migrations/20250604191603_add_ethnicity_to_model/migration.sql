/*
  Warnings:

  - You are about to drop the column `ethinicity` on the `Model` table. All the data in the column will be lost.
  - Added the required column `ethnicity` to the `Model` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "EthnicityEnum" AS ENUM ('WHITE', 'BLACK', 'ASIAN_AMERICAN', 'EAST_ASIAN', 'SOUTH_EAST_ASIAN', 'SOUTH_ASIAN', 'MIDDLE_EASTERN', 'PACIFIC', 'HISPANIC');

-- AlterTable
ALTER TABLE "Model" DROP COLUMN "ethinicity",
ADD COLUMN     "ethnicity" "EthnicityEnum" NOT NULL;

-- DropEnum
DROP TYPE "EthinicityEnum";
