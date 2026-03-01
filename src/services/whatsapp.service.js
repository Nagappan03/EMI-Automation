import twilio from "twilio";

const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

export async function sendMonthlyWhatsApp({
    month,
    year,
    sheetLink
}) {
    const monthName = new Date(year, month - 1).toLocaleString("en-IN", {
        month: "long"
    });

    try {
        if (!process.env.TWILIO_WHATSAPP_TEMPLATE_SID) {
            console.log("[WHATSAPP] Template SID missing. Skipping.");
            return false;
        }

        const recipientsRaw = process.env.WHATSAPP_RECIPIENTS;

        if (!recipientsRaw) {
            console.log("[WHATSAPP] No recipients configured. Skipping.");
            return false;
        }

        const recipients = recipientsRaw
            .split(",")
            .map(r => r.trim())
            .filter(Boolean);

        let successCount = 0;

        for (const to of recipients) {
            try {
                await client.messages.create({
                    from: process.env.TWILIO_WHATSAPP_FROM,
                    to,
                    contentSid: process.env.TWILIO_WHATSAPP_TEMPLATE_SID,
                    contentVariables: JSON.stringify({
                        "1": String(monthName),
                        "2": String(year),
                        "3": String(sheetLink)
                    })
                });

                console.log(`[WHATSAPP] Sent to ${to}`);
                successCount++;

            } catch (err) {
                console.error(`[WHATSAPP ERROR] Failed for ${to}:`, err.message);
            }
        }

        console.log(
            `[WHATSAPP] ${successCount}/${recipients.length} messages sent`
        );

        return successCount > 0;

    } catch (err) {
        console.error("[WHATSAPP FATAL ERROR]", err.message);
        return false;
    }
}