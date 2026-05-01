import prisma from "../lib/prisma.js";
import { isLastDayOfMonth } from "../utils/date.monthly.js";
import { sendPersonalizedNotificationsFromDB } from "./customNotification.service.js";

export async function runMonthlyNotification({ force = false } = {}, triggeredBy = "CRON") {
    const now = new Date();

    if (!force && !isLastDayOfMonth(now)) {
        console.log("[MONTHLY] Not last day. Skipping.");
        return "SKIPPED";
    }

    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const existing = await prisma.monthlyNotification.findFirst({
        where: { month, year, type: "EMAIL", triggeredBy: "CRON" }
    });

    if (existing?.status === "SUCCESS") {
        console.log("[MONTHLY] Already sent for this month");
        return "SKIPPED";
    }

    const record = await prisma.monthlyNotification.create({
        data: {
            month,
            year,
            type: "EMAIL",
            status: "RUNNING",
            triggeredBy
        }
    });

    try {
        await sendPersonalizedNotificationsFromDB();

        const completedAt = new Date();

        await prisma.monthlyNotification.update({
            where: { id: record.id },
            data: { status: "SUCCESS", completedAt },
        });

        console.log("[MONTHLY] Notification recorded");
        return "SUCCESS";

    } catch (err) {
        const completedAt = new Date();
        await prisma.monthlyNotification.update({
            where: { id: record.id },
            data: {
                status: "FAILED",
                errorMessage: err.message,
                completedAt
            }
        });

        console.error("[MONTHLY ERROR]", err);
        return "FAILED";
    }
}