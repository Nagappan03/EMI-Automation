import { google } from "googleapis";
import { getOAuthClient } from "./gmail.auth.js";

export async function sendFailureAlertEmail({
    axisStatus,
    kotakStatus,
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
    const monthName = now.toLocaleString("en-IN", { month: "long" });
    const year = now.getFullYear();

    const oauth2Client = getOAuthClient();
    oauth2Client.setCredentials({
        refresh_token: process.env.GMAIL_REFRESH_TOKEN
    });

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    const recipients = [
        "nagappans22@gmail.com"
        // Later: add more here
    ];

    const subject = `EMI Tracker Update – ${monthName} ${year}`;

    const body = `
Hey,

The Credit Card EMI Tracker has been updated for ${monthName} ${year}.

You can view it here:
https://docs.google.com/spreadsheets/d/1yYSilofr_Cglmh2fmgaVO3WCeQddy1lRsE9qxVBJ_dw/edit

Regards,
EMI Tracker
`;

    const message = [
        `From: "EMI Tracker" <${process.env.ALERT_EMAIL_FROM}>`,
        `To: ${recipients.join(", ")}`,
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

    console.log("[MONTHLY] Email notification sent successfully");
}