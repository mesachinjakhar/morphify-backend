/*
  Warnings:

  - The values [ASIANAMERICAN,EASTASIAN,SOUTHEASTASIAN,SOUTHASIAN,MIDDLEEASTERN] on the enum `EthinicityEnum` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "EthinicityEnum_new" AS ENUM ('WHITE', 'BLACK', 'ASIAN_AMERICAN', 'EAST_ASIAN', 'SOUTH_EAST_ASIAN', 'SOUTH_ASIAN', 'MIDDLE_EASTERN', 'PACIFIC', 'HISPANIC');
ALTER TABLE "Model" ALTER COLUMN "ethinicity" TYPE "EthinicityEnum_new" USING ("ethinicity"::text::"EthinicityEnum_new");
ALTER TYPE "EthinicityEnum" RENAME TO "EthinicityEnum_old";
ALTER TYPE "EthinicityEnum_new" RENAME TO "EthinicityEnum";
DROP TYPE "EthinicityEnum_old";
COMMIT;
