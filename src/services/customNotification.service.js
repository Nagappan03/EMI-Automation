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

    console.log(
        "[NOTIFICATION] Sending monthly personalized notifications"
    );

    /*
     * The monthly notification runs on the last day of the month.
     *
     * We need the statement belonging to THIS month.
     *
     * Example:
     *
     * September 30 notification
     * → look for September statement
     *
     * October 31 notification
     * → look for October statement
     *
     * This is important for completed EMIs:
     * 6/6 in September must be sent.
     * The same 6/6 record must NOT be sent again in October.
     */
    const now = new Date();

    const notificationMonth = now.getMonth() + 1;
    const notificationYear = now.getFullYear();

    const monthlyData = await prisma.processedStatement.findMany({
        where: {
            statementMonth: notificationMonth,
            statementYear: notificationYear
        },
        orderBy: {
            processedAt: "desc"
        }
    });

    for (const user of userConfig) {

        const data = monthlyData.find(
            d => d.bank === user.bank
        );

        if (!data) {
            console.log(
                `[NOTIFICATION] No current-month data for ${user.bank}`
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

        console.log(
            `[NOTIFICATION] ${user.name} → ${data.bank}`
        );

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