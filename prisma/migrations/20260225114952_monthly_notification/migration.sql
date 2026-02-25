-- CreateTable
CREATE TABLE "MonthlyNotification" (
    "id" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL,

    CONSTRAINT "MonthlyNotification_pkey" PRIMARY KEY ("id")
);
