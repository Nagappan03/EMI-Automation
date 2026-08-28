import prisma from "../lib/prisma.js";
import { userConfig } from "../config/user.config.js";
import { sendEmail } from "./email.service.js";
import { sendWhatsAppMessage } from "./whatsapp.service.js";

function formatCurrency(amount) {
    return new Intl.NumberFormat("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

function getMonthYear() {
    const now = new Date();

    // Move to next month
    const nextMonthDate = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        1
    );

    return nextMonthDate.toLocaleString("en-IN", {
        month: "long",
        year: "numeric"
    });
}

function buildMessage({
    name,
    bank,
    amount,
    currentInstallment,
    totalInstallments
}) {
    const monthYear = getMonthYear();

    return `
Hi ${name},

Your EMI update for ${bank} Bank - ${monthYear}:

Amount: ₹${formatCurrency(amount)}
Installment: ${currentInstallment} of ${totalInstallments}

You can view the full tracker here:
${process.env.GOOGLE_SHEET_LINK}

- EMI Vault Solutions
`.trim();
}

export async function sendPersonalizedNotificationsFromDB() {

    console.log("[NOTIFICATION] Sending monthly personalized notifications");

    // Get latest entry per bank
    const latestData = await prisma.processedStatement.findMany({
        distinct: ["bank"],
        orderBy: {
            processedAt: "desc"
        }
    });

    for (const user of userConfig) {

        const data = latestData.find(d => d.bank === user.bank);

        if (!data) {
            console.log(`[NOTIFICATION] No data for ${user.bank}`);
            continue;
        }

        // EMI has been completely paid off.
        // Do not send any further monthly notifications.
        if (
            data.currentInstallment >= data.totalInstallments
        ) {
            console.log(
                `[NOTIFICATION] ${data.bank} EMI completed ` +
                `(${data.currentInstallment}/${data.totalInstallments}). Skipping.`
            );
            continue;
        }

        const message = buildMessage({
            name: user.name,
            bank: data.bank,
            amount: data.amount,
            currentInstallment: data.currentInstallment,
            totalInstallments: data.totalInstallments
        });

        console.log(`[NOTIFICATION] ${user.name} → ${data.bank}`);
        console.log(message);

        // EMAIL
        if (user.email) {
            await sendEmail({
                to: user.email,
                subject: `EMI Update - ${data.bank} Bank`,
                body: message
            });
        }

        // WHATSAPP
        if (
            user.phone &&
            process.env.WHATSAPP_ENABLED === "true"
        ) {
            await sendWhatsAppMessage({
                to: user.phone,
                name: user.name,
                bank: `${data.bank} Bank`,
                amount: formatCurrency(data.amount),
                currentInstallment: data.currentInstallment,
                totalInstallments: data.totalInstallments,
                monthYear: getMonthYear()
            });
        }
    }
}