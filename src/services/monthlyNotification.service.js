import prisma from "../lib/prisma.js";
import { isLastDayOfMonth } from "../utils/date.monthly.js";
import { sendMonthlyEmail } from "./email.service.js";
import { sendWhatsAppMessage } from "./whatsapp.service.js";

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

    // 1️⃣ Email (mandatory)
    await sendMonthlyEmail();

    // 2️⃣ WhatsApp (best effort)
    try {
        const monthName = now.toLocaleString("en-IN", { month: "long" });

        await sendWhatsAppMessage({
            to: "+916369837476",
            body: `EMI Tracker updated for ${monthName} ${year}.\n\nView here:\nhttps://docs.google.com/spreadsheets/d/1yYSilofr_Cglmh2fmgaVO3WCeQddy1lRsE9qxVBJ_dw/edit`
        });
    } catch (err) {
        console.error("[WHATSAPP ERROR - NON BLOCKING]", err.message);
    }

    // 3️⃣ Record as sent
    await prisma.monthlyNotification.create({
        data: {
            month,
            year,
            type: "EMAIL"
        }
    });

    console.log("[MONTHLY] Monthly notification recorded");
}