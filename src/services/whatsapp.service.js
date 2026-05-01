import twilio from "twilio";

const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

export async function sendWhatsAppMessage({
    to,
    name,
    bank,
    amount,
    currentInstallment,
    totalInstallments,
    monthYear
}) {
    try {
        if (!process.env.TWILIO_WHATSAPP_TEMPLATE_SID) {
            console.log("[WHATSAPP] Template SID missing. Skipping.");
            return;
        }

        await client.messages.create({
            from: process.env.TWILIO_WHATSAPP_FROM,
            to,
            contentSid: process.env.TWILIO_WHATSAPP_TEMPLATE_SID,
            contentVariables: JSON.stringify({
                "1": name,
                "2": bank,
                "3": monthYear,
                "4": amount,
                "5": String(currentInstallment),
                "6": String(totalInstallments),
                "7": process.env.GOOGLE_SHEET_LINK
            })
        });

        console.log(`[WHATSAPP] Sent to ${to}`);

    } catch (err) {
        console.error(`[WHATSAPP ERROR] Failed for ${to}:`, err.message);
    }
}