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

    const query = 'from:"cc.statements" (subject:XX51 OR subject:5851) has:attachment';

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
            extractMonthYearFromAxisSubject(subjectHeader.value);

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

    const query = 'from:"cardstatement" subject:"Credit Card" has:attachment';

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

        const internalTimestamp = Number(msg.data.internalDate);

        // Ensure it has PDF attachment
        const parts = msg.data.payload.parts || [];
        const attachmentPart = parts.find(p => p.filename?.endsWith(".pdf"));

        if (!attachmentPart) continue;

        // Pick newest based on Gmail internalDate
        if (!latest || internalTimestamp > latest.internalTimestamp) {
            latest = {
                id: m.id,
                msg,
                attachmentPart,
                internalTimestamp
            };
        }
    }

    if (!latest) {
        console.log("[KOTAK] No valid PDF statement found.");
        return null;
    }

    const att = await gmail.users.messages.attachments.get({
        userId: "me",
        messageId: latest.id,
        id: latest.attachmentPart.body.attachmentId
    });

    const buffer = Buffer.from(att.data.data, "base64");

    const filePath = path.join("/tmp", "kotak-statement.pdf");
    fs.writeFileSync(filePath, buffer);

    return {
        statementKey: latest.id,
        pdfPath: filePath
    };
}

export async function fetchHsbcStatement() {

    const oauth2Client = getOAuthClient();
    oauth2Client.setCredentials({
        refresh_token: process.env.GMAIL_REFRESH_TOKEN
    });

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    const query =
        'from:"creditcardstatement" subject:"HSBC Credit Card statement" has:attachment';

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

        const parts = msg.data.payload.parts || [];

        // console.log("[HSBC DEBUG] Attachments found in email:");

        // parts.forEach(p => {
        //     console.log(" -", p.filename);
        // });

        const attachmentPart = parts.find(
            p => /^\d{8}\.pdf$/.test(p.filename)
        );

        // if (attachmentPart) {
        //     console.log("[HSBC DEBUG] Selected attachment:", attachmentPart.filename);
        // } else {
        //     console.log("[HSBC DEBUG] No attachment matched regex");
        // }

        if (!attachmentPart) continue;

        const internalTimestamp = Number(msg.data.internalDate);

        if (!latest || internalTimestamp > latest.internalTimestamp) {
            latest = {
                id: m.id,
                msg,
                attachmentPart,
                internalTimestamp
            };
        }
    }

    if (!latest) return null;

    const att = await gmail.users.messages.attachments.get({
        userId: "me",
        messageId: latest.id,
        id: latest.attachmentPart.body.attachmentId
    });

    const buffer = Buffer.from(att.data.data, "base64");

    const filePath = path.join("/tmp", "hsbc-statement.pdf");
    fs.writeFileSync(filePath, buffer);

    return {
        statementKey: latest.id,
        pdfPath: filePath
    };
}