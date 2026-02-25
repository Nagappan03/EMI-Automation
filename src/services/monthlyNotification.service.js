import prisma from "../lib/prisma.js";
import { isLastDayOfMonth } from "../utils/date.monthly.js";
import { sendMonthlyEmail } from "./email.service.js";

export async function runMonthlyNotification({ force = false } = {}) {
    const now = new Date();

    if (!force && !isLastDayOfMonth(now)) {
        console.log("[MONTHLY] Not last day. Skipping.");
        return;
    }

    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const alreadySent = await prisma.monthlyNotification.findFirst({
        where: { month, year, type: "EMAIL" }
    });

    if (alreadySent) {
        console.log("[MONTHLY] Already sent for this month");
        return;
    }

    await sendMonthlyEmail();

    await prisma.monthlyNotification.create({
        data: {
            month,
            year,
            type: "EMAIL"
        }
    });

    console.log("[MONTHLY] Monthly email recorded in DB");
}