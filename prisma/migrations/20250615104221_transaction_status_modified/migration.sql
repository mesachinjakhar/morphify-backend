/*
  Warnings:

  - The values [REFUNDED] on the enum `TransactionStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [DEDUCTION,TOPUP] on the enum `TransactionType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "TransactionStatus_new" AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED');
ALTER TABLE "MstarTransaction" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "MstarTransaction" ALTER COLUMN "status" TYPE "TransactionStatus_new" USING ("status"::text::"TransactionStatus_new");
ALTER TYPE "TransactionStatus" RENAME TO "TransactionStatus_old";
ALTER TYPE "TransactionStatus_new" RENAME TO "TransactionStatus";
DROP TYPE "TransactionStatus_old";
ALTER TABLE "MstarTransaction" ALTER COLUMN "status" SET DEFAULT 'COMPLETED';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "TransactionType_new" AS ENUM ('DEBIT', 'CREDIT', 'REFUND');
ALTER TABLE "MstarTransaction" ALTER COLUMN "transactionType" TYPE "TransactionType_new" USING ("transactionType"::text::"TransactionType_new");
ALTER TYPE "TransactionType" RENAME TO "TransactionType_old";
ALTER TYPE "TransactionType_new" RENAME TO "TransactionType";
DROP TYPE "TransactionType_old";
COMMIT;
