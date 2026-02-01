import { google } from "googleapis";
import fs from "fs";
import path from "path";
import { getOAuthClient } from "./gmail.auth.js";

export async function fetchLatestStatement(bank) {
    const oauth2Client = getOAuthClient();
    oauth2Client.setCredentials({
        refresh_token: process.env.GMAIL_REFRESH_TOKEN
    });

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    const query =
        bank === "Axis"
            ? "from:cc.statements@axisbank.com ending XX51"
            : "from:cardstatement@kotak.bank.in";

    const res = await gmail.users.messages.list({
        userId: "me",
        q: query,
        maxResults: 5
    });

    if (!res.data.messages?.length) return null;

    const msgId = res.data.messages[0].id;
    const msg = await gmail.users.messages.get({
        userId: "me",
        id: msgId
    });

    const parts = msg.data.payload.parts || [];
    const attachmentPart = parts.find(p => p.filename.endsWith(".pdf"));

    if (!attachmentPart) throw new Error("No PDF attachment found");

    const att = await gmail.users.messages.attachments.get({
        userId: "me",
        messageId: msgId,
        id: attachmentPart.body.attachmentId
    });

    const buffer = Buffer.from(att.data.data, "base64");

    const filePath = path.join("/tmp", `${bank}.pdf`);
    fs.writeFileSync(filePath, buffer);

    return filePath;
}