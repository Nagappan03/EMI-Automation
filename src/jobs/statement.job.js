import { fetchAxisStatement } from "../services/gmail.service.js"
import { updateAxisTracker } from "../services/sheets.service.js";
import { extractAxisInstallmentInfo } from "../utils/axis.utils.js";

import { fetchKotakStatement } from "../services/gmail.service.js";
import { updateKotakTracker } from "../services/sheets.service.js";
import {
    extractKotakAmount,
    extractKotakInstallmentInfo,
    extractKotakMonthYear
} from "../utils/kotak.utils.js";

import { fetchHsbcStatement } from "../services/gmail.service.js";
import { updateHsbcTracker } from "../services/sheets.service.js";
import {
    extractHsbcInstallmentInfo,
    extractHsbcEmiAmount
} from "../utils/hsbc.utils.js";

import { withRetry } from "../utils/retry.utils.js";
import { decryptAndExtractText } from "../services/pdf.service.js";
import { getNextMonthYear } from "../utils/date.utils.js";
import { sendFailureAlertEmail } from "../services/email.service.js";
import prisma from "../lib/prisma.js";

/**
 * Main job entry point
 * This is what /test-full-run and cron will call
 */
export async function runStatementJob(triggeredBy = "CRON") {
    console.log("[JOB] Statement job started");

    const existingRunning = await prisma.jobRun.findFirst({
        where: { status: "RUNNING" }
    });

    if (existingRunning) {
        console.log("[JOB] Another run already in progress. Skipping.");
        return "SKIPPED_RUNNING";
    }

    const jobRun = await prisma.jobRun.create({
        data: {
            status: "RUNNING",
            triggeredBy
        }
    });

    let axisStatus = "SKIPPED";
    let kotakStatus = "SKIPPED";
    let hsbcStatus = "SKIPPED";
    let overallStatus = "SUCCESS";
    let errorMessage = null;

    try {
        axisStatus = await processAxisStatement();
    } catch (err) {
        axisStatus = "FAILED";
        overallStatus = "FAILED";
        errorMessage = errorMessage
            ? errorMessage + ` | Axis: ${err.message}`
            : `Axis: ${err.message}`;
    }

    try {
        kotakStatus = await processKotakStatement();
    } catch (err) {
        kotakStatus = "FAILED";
        overallStatus = "FAILED";
        errorMessage = errorMessage
            ? errorMessage + ` | Kotak: ${err.message}`
            : `Kotak: ${err.message}`;
    }

    try {
        hsbcStatus = await processHsbcStatement();
    } catch (err) {
        hsbcStatus = "FAILED";
        overallStatus = "FAILED";
        errorMessage = errorMessage
            ? errorMessage + ` | HSBC: ${err.message}`
            : `HSBC: ${err.message}`;
    }

    const completedAt = new Date();

    await prisma.jobRun.update({
        where: { id: jobRun.id },
        data: {
            status: overallStatus,
            axisStatus,
            kotakStatus,
            hsbcStatus,
            errorMessage,
            completedAt
        }
    });

    if (overallStatus === "FAILED") {
        await sendFailureAlertEmail({
            axisStatus,
            kotakStatus,
            hsbcStatus,
            errorMessage,
            triggeredBy
        });
    }

    console.log("[JOB] Statement job completed");

    return overallStatus;
}

/**
 * Process Axis Bank credit card statement
 */
async function processAxisStatement() {
    console.log("[AXIS] Processing Axis Bank statement");

    // 1. Fetch Axis statement email + metadata
    const axisData = await withRetry(
        () => fetchAxisStatement(),
        { label: "Fetch Axis statement" }
    );

    if (!axisData) {
        console.log("[AXIS] No statement found");
        return "SKIPPED";
    }

    const {
        statementKey,
        pdfPath,
        statementMonth,
        statementYear
    } = axisData;

    const alreadyProcessed = await prisma.processedStatement.findUnique({
        where: { statementKey: axisData.statementKey }
    });

    if (alreadyProcessed) {
        console.log("[AXIS] Already processed");
        return "SKIPPED";
    }

    console.log(`[AXIS] New statement detected: ${statementKey}`);

    // 3. Decrypt & extract text from PDF
    const statementText = await withRetry(
        () => decryptAndExtractText({
            filePath: pdfPath,
            password: process.env.AXIS_PDF_PASSWORD,
            bank: "Axis"
        }),
        { label: "Decrypt Axis PDF" }
    );

    // 4. Extract installment info (REF# based)
    const { currentInstallment, totalInstallments } =
        extractAxisInstallmentInfo(statementText);

    // 5. Extract EMI amount (principal + interest + GST)
    const emiAmount = extractAxisEmiAmount(statementText);

    // 6. Compute T + 1 month/year for tracker update
    const { month: nextMonth, year: nextYear } =
        getNextMonthYear(statementMonth, statementYear);

    // 7. Update Google Sheet (single row, deterministic)
    await withRetry(
        () => updateAxisTracker({
            amount: emiAmount,
            month: nextMonth,
            year: nextYear,
            totalInstallments,
            currentInstallment
        }),
        { label: "Update Axis tracker" }
    );

    // 8. Mark statement as processed (idempotency lock)
    await prisma.processedStatement.create({
        data: {
            bank: "AXIS",
            statementKey: axisData.statementKey
        }
    });

    console.log('[AXIS] Successfully processed statement');

    return "SUCCESS";
}

/**
 * Process Kotak Bank credit card statement
 */
async function processKotakStatement() {
    console.log("[KOTAK] Processing Kotak Bank statement");

    const kotakData = await withRetry(
        () => fetchKotakStatement(),
        { label: "Fetch Kotak statement" }
    );

    if (!kotakData) {
        console.log("[KOTAK] No statement found");
        return "SKIPPED";
    }

    const { statementKey, pdfPath } = kotakData;

    const alreadyProcessed = await prisma.processedStatement.findUnique({
        where: { statementKey: kotakData.statementKey }
    });

    if (alreadyProcessed) {
        console.log('[KOTAK] Already processed');
        return "SKIPPED";
    }

    console.log(`[KOTAK] New statement detected: ${statementKey}`);

    const statementText = await withRetry(
        () => decryptAndExtractText({
            filePath: pdfPath,
            password: process.env.KOTAK_PDF_PASSWORD,
            bank: "Kotak"
        }),
        { label: "Decrypt Kotak PDF" }
    );

    const { statementMonth, statementYear } =
        extractKotakMonthYear(statementText);

    const amount = extractKotakAmount(statementText);

    console.log("[KOTAK] Total EMI amount calculated:", amount);

    const { currentInstallment, totalInstallments } =
        extractKotakInstallmentInfo(statementText);

    const { month: nextMonth, year: nextYear } =
        getNextMonthYear(statementMonth, statementYear);

    await withRetry(
        () => updateKotakTracker({
            amount,
            month: nextMonth,
            year: nextYear,
            currentInstallment,
            totalInstallments
        }),
        { label: "Update Kotak tracker" }
    );

    await prisma.processedStatement.create({
        data: {
            bank: "KOTAK",
            statementKey: kotakData.statementKey
        }
    });

    console.log('[KOTAK] Successfully processed statement');

    return "SUCCESS";
}

/**
 * Process HSBC Bank credit card statement
 */
async function processHsbcStatement() {

    console.log("[HSBC] Processing HSBC Bank statement");

    const hsbcData = await withRetry(
        () => fetchHsbcStatement(),
        { label: "Fetch HSBC statement" }
    );

    if (!hsbcData) {
        console.log("[HSBC] No statement found");
        return "SKIPPED";
    }

    const { statementKey, pdfPath } = hsbcData;

    const alreadyProcessed = await prisma.processedStatement.findUnique({
        where: { statementKey }
    });

    if (alreadyProcessed) {
        console.log("[HSBC] Already processed");
        return "SKIPPED";
    }

    console.log(`[HSBC] New statement detected: ${statementKey}`);

    const statementText = await withRetry(
        () => decryptAndExtractText({
            filePath: pdfPath,
            password: process.env.HSBC_PDF_PASSWORD,
            bank: "HSBC"
        }),
        { label: "Decrypt HSBC PDF" }
    );

    const { currentInstallment, totalInstallments } =
        extractHsbcInstallmentInfo(statementText);

    const amount = extractHsbcEmiAmount(statementText);

    const now = new Date();
    const { month: nextMonth, year: nextYear } =
        getNextMonthYear(
            now.toLocaleString("en-IN", { month: "short" }),
            now.getFullYear()
        );

    await withRetry(
        () => updateHsbcTracker({
            amount,
            month: nextMonth,
            year: nextYear,
            currentInstallment,
            totalInstallments
        }),
        { label: "Update HSBC tracker" }
    );

    await prisma.processedStatement.create({
        data: {
            bank: "HSBC",
            statementKey
        }
    });

    console.log("[HSBC] Successfully processed statement");

    return "SUCCESS";
}

/**
 * Axis EMI amount extraction
 * Rules:
 * - Sum of:
 *   - EMI PRINCIPAL (REF# 65261897)
 *   - EMI INTEREST (REF# 65261897)
 *   - Highest GST value in statement
 */
function extractAxisEmiAmount(text) {
    // EMI principal
    const principalMatch = text.match(
        /EMI PRINCIPAL - \d+\/\d+, REF# 65261897.*?([\d,]+\.\d{2}) Dr/
    );

    // EMI interest
    const interestMatch = text.match(
        /EMI INTEREST - \d+\/\d+, REF# 65261897.*?([\d,]+\.\d{2}) Dr/
    );

    if (!principalMatch || !interestMatch) {
        throw new Error("[Axis] EMI principal or interest not found");
    }

    const principal = parseFloat(principalMatch[1].replace(/,/g, ""));
    const interest = parseFloat(interestMatch[1].replace(/,/g, ""));

    // GST — take the HIGHEST GST in the statement
    const gstMatches = [...text.matchAll(/GST\s+([\d,]+\.\d{2}) Dr/g)];

    if (gstMatches.length === 0) {
        throw new Error("[Axis] GST not found in statement");
    }

    const gstValues = gstMatches.map(m =>
        parseFloat(m[1].replace(/,/g, ""))
    );

    const gst = Math.max(...gstValues);

    const total = Number((principal + interest + gst).toFixed(2));

    console.log(
        `[AXIS] EMI calculated → Principal: ${principal}, Interest: ${interest}, GST: ${gst}, Total: ${total}`
    );

    return total;
}