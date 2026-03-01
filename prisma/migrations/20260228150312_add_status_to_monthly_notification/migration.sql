-- AlterTable
ALTER TABLE "MonthlyNotification" ADD COLUMN     "errorMessage" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'PENDING';
