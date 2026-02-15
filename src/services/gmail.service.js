import { google } from "googleapis";
import fs from "fs";
import path from "path";
import { getOAuthClient } from "./gmail.auth.js";

const MONTH_MAP = {
    January: "Jan",
    February: "Feb",
    March: "Mar",
    April: "Apr",
    May: "May",
    June: "Jun",
    July: "Jul",
    August: "Aug",
    September: "Sep",
    October: "Oct",
    November: "Nov",
    December: "Dec"
};

function extractMonthYearFromAxisSubject(subject) {
    // Example:
    // "Your Axis Bank Visa Privilege Credit Card Statement ending XX51 - January 2026"
    const match = subject.match(
        /-\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/
    );

    if (!match) {
        throw new Error("[Axis] Unable to extract month/year from subject");
    }

    return {
        statementMonth: MONTH_MAP[match[1]],
        statementYear: match[2]
    };
}

export async function fetchAxisStatement() {
    const oauth2Client = getOAuthClient();
    oauth2Client.setCredentials({
        refresh_token: process.env.GMAIL_REFRESH_TOKEN
    });

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    const query = 'from:cc.statements@axisbank.com "ending XX51" has:attachment';

    const res = await gmail.users.messages.list({
        userId: "me",
        q: query,
        maxResults: 20
    });

    if (!res.data.messages?.length) return null;

    let latest = null;

    for (const m of res.data.messages) {
        const msg = await gmail.users.messages.get({
            userId: "me",
            id: m.id
        });

        const headers = msg.data.payload.headers || [];
        const subjectHeader = headers.find(h => h.name === "Subject");

        if (!subjectHeader) continue;

        const { statementMonth, statementYear } =
            extractAxisMonthYearFromSubject(subjectHeader.value);

        const internalTimestamp = Number(msg.data.internalDate);

        if (!latest || internalTimestamp > latest.internalTimestamp) {
            latest = {
                id: m.id,
                msg,
                statementMonth,
                statementYear,
                internalTimestamp
            };
        }
    }

    const parts = latest.msg.data.payload.parts || [];
    const attachmentPart = parts.find(p => p.filename.endsWith(".pdf"));

    if (!attachmentPart) throw new Error("[Axis] No PDF attachment found");

    const att = await gmail.users.messages.attachments.get({
        userId: "me",
        messageId: latest.id,
        id: attachmentPart.body.attachmentId
    });

    const buffer = Buffer.from(att.data.data, "base64");

    const filePath = path.join("/tmp", "axis-statement.pdf");
    fs.writeFileSync(filePath, buffer);

    return {
        statementKey: latest.id,
        pdfPath: filePath,
        statementMonth: latest.statementMonth,
        statementYear: latest.statementYear
    };
}

export async function fetchKotakStatement() {
    const oauth2Client = getOAuthClient();
    oauth2Client.setCredentials({
        refresh_token: process.env.GMAIL_REFRESH_TOKEN
    });

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    const query = "from:cardstatement@kotak.bank.in has:attachment";

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

    if (!attachmentPart) {
        throw new Error("[Kotak] No PDF attachment found");
    }

    const att = await gmail.users.messages.attachments.get({
        userId: "me",
        messageId: msgId,
        id: attachmentPart.body.attachmentId
    });

    const buffer = Buffer.from(att.data.data, "base64");

    const filePath = path.join("/tmp", "kotak-statement.pdf");
    fs.writeFileSync(filePath, buffer);

    return {
        statementKey: msgId,
        pdfPath: filePath,
    };
}