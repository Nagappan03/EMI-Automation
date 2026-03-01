import prisma from "../lib/prisma.js";
import { isLastDayOfMonth } from "../utils/date.monthly.js";
import { sendMonthlyEmail } from "./email.service.js";
import { sendMonthlyWhatsApp } from "./whatsapp.service.js";

export async function runMonthlyNotification({ force = false } = {}, triggeredBy = "CRON") {
    const now = new Date();

    if (!force && !isLastDayOfMonth(now)) {
        console.log("[MONTHLY] Not last day. Skipping.");
        return "SKIPPED";
    }

    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    // Next month/year for notification content (tracker was updated for next month)
    const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const nextMonth = nextMonthDate.getMonth() + 1;
    const nextYear = nextMonthDate.getFullYear();

    const sheetLink = process.env.GOOGLE_SHEET_LINK;

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
        // 1️⃣ Email (mandatory)
        await sendMonthlyEmail();

        // 2️⃣ WhatsApp (optional)
        // const whatsappSent = await sendMonthlyWhatsApp({
        //     month: nextMonth,
        //     year: nextYear,
        //     sheetLink
        // });

        // if (!whatsappSent) {
        //     console.log("[MONTHLY] WhatsApp failed but email succeeded.");
        // }

        const completedAt = new Date();

        await prisma.monthlyNotification.update({
            where: { id: record.id },
            data: { status: "SUCCESS", completedAt },
        });

        console.log("[MONTHLY] Notification recorded");
        return "SUCCESS";

    } catch (err) {

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