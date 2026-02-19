-- AlterTable
ALTER TABLE "JobRun" ADD COLUMN     "triggeredBy" TEXT NOT NULL DEFAULT 'CRON';
