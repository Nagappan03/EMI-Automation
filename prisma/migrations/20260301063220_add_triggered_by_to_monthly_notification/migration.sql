-- AlterTable
ALTER TABLE "MonthlyNotification" ADD COLUMN     "triggeredBy" TEXT NOT NULL DEFAULT 'CRON';
