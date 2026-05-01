-- AlterTable
ALTER TABLE "ProcessedStatement" ADD COLUMN     "amount" DOUBLE PRECISION,
ADD COLUMN     "currentInstallment" INTEGER,
ADD COLUMN     "totalInstallments" INTEGER;
