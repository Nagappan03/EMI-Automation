import { google } from "googleapis";
import { getOAuthClient } from "./gmail.auth.js";

export async function sendFailureAlertEmail({
    axisStatus,
    kotakStatus,
    hsbcStatus,
    errorMessage,
    triggeredBy
}) {
    try {
        const oauth2Client = getOAuthClient();
        oauth2Client.setCredentials({
            refresh_token: process.env.GMAIL_REFRESH_TOKEN
        });

        const gmail = google.gmail({ version: "v1", auth: oauth2Client });

        const subject = "EMI Automation FAILED";

        const body = `
EMI Automation Failure Alert

Triggered By: ${triggeredBy}
Time: ${new Date().toISOString()}

Axis Status: ${axisStatus}
Kotak Status: ${kotakStatus}
HSBC Status: ${hsbcStatus}

Error:
${errorMessage || "Unknown error"}
`;

        const message = [
            `From: "EMI Automation" <${process.env.ALERT_EMAIL_FROM}>`,
            `To: ${process.env.ALERT_EMAIL_TO}`,
            `Subject: ${subject}`,
            "Content-Type: text/plain; charset=utf-8",
            "",
            body
        ].join("\n");

        const encodedMessage = Buffer.from(message)
            .toString("base64")
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, "");

        await gmail.users.messages.send({
            userId: "me",
            requestBody: {
                raw: encodedMessage
            }
        });

        console.log("[ALERT] Failure email sent");
    } catch (err) {
        console.error("[ALERT ERROR] Failed to send alert email:", err.message);
    }
}

export async function sendMonthlyEmail() {
    const now = new Date();
    // Report the *next* month (the month the tracker update covers)
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const monthName = nextMonth.toLocaleString("en-IN", { month: "long" });
    const year = nextMonth.getFullYear();

    const oauth2Client = getOAuthClient();
    oauth2Client.setCredentials({
        refresh_token: process.env.GMAIL_REFRESH_TOKEN
    });

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    const recipientsRaw = process.env.EMAIL_RECIPIENTS;

    if (!recipientsRaw) {
        console.log("[MONTHLY EMAIL] No recipients configured. Skipping.");
        return false;
    }

    const recipients = recipientsRaw
        .split(",")
        .map(r => r.trim())
        .filter(Boolean);

    const subject = `EMI Tracker Update Notification for ${monthName} ${year}`;

    const body = `
Hey,

The Credit Card EMI Tracker has been updated for ${monthName} ${year}.

You can view it here:
${process.env.GOOGLE_SHEET_LINK}

Regards,
Nagappan S
`;

    let successCount = 0;

    for (const to of recipients) {
        try {
            const message = [
                `From: "EMI Tracker Automation Engine" <${process.env.ALERT_EMAIL_FROM}>`,
                `To: ${to}`,
                `Subject: ${subject}`,
                "Content-Type: text/plain; charset=utf-8",
                "",
                body
            ].join("\n");

            const encodedMessage = Buffer.from(message)
                .toString("base64")
                .replace(/\+/g, "-")
                .replace(/\//g, "_")
                .replace(/=+$/, "");

            await gmail.users.messages.send({
                userId: "me",
                requestBody: {
                    raw: encodedMessage
                }
            });

            console.log(`[MONTHLY EMAIL] Sent to ${to}`);
            successCount++;

        } catch (err) {
            console.error(`[MONTHLY EMAIL ERROR] Failed for ${to}:`, err.message);
        }
    }

    console.log(`[MONTHLY EMAIL] ${successCount}/${recipients.length} sent`);

    return successCount > 0;
}