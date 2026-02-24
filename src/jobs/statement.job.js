import { fetchAxisStatement } from "../services/gmail.service.js";
import { decryptAndExtractText } from "../services/pdf.service.js";
import { updateAxisTracker } from "../services/sheets.service.js";
import { extractAxisInstallmentInfo } from "../utils/axis.utils.js";

import { fetchKotakStatement } from "../services/gmail.service.js";
import {
    extractKotakAmount,
    extractKotakInstallmentInfo,
    extractKotakMonthYear
} from "../utils/kotak.utils.js";
import { updateKotakTracker } from "../services/sheets.service.js";

import { getNextMonthYear } from "../utils/date.utils.js";
import { sendFailureAlertEmail } from "../services/email.service.js";

import prisma from "../lib/prisma.js";

/**
 * Main job entry point
 * This is what /test-full-run and cron will call
 */
export async function runStatementJob(triggeredBy = "CRON") {
    console.log("[JOB] Statement job started");

    const jobRun = await prisma.jobRun.create({
        data: {
            status: "RUNNING",
            triggeredBy
        }
    });

    let axisStatus = "SKIPPED";
    let kotakStatus = "SKIPPED";
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

    const completedAt = new Date();

    await prisma.jobRun.update({
        where: { id: jobRun.id },
        data: {
            status: overallStatus,
            axisStatus,
            kotakStatus,
            errorMessage,
            completedAt
        }
    });

    if (overallStatus === "FAILED") {
        await sendFailureAlertEmail({
            axisStatus,
            kotakStatus,
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
    const axisData = await fetchAxisStatement();

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
    const statementText = await decryptAndExtractText({
        filePath: pdfPath,
        password: process.env.AXIS_PDF_PASSWORD,
        bank: "Axis"
    });

    // 4. Extract installment info (REF# based)
    const { currentInstallment, totalInstallments } =
        extractAxisInstallmentInfo(statementText);

    // 5. Extract EMI amount (principal + interest + GST)
    const emiAmount = extractAxisEmiAmount(statementText);

    // 6. Compute T + 1 month/year for tracker update
    const { month: nextMonth, year: nextYear } =
        getNextMonthYear(statementMonth, statementYear);

    // 7. Update Google Sheet (single row, deterministic)
    await updateAxisTracker({
        amount: emiAmount,
        month: nextMonth,
        year: nextYear,
        totalInstallments,
        currentInstallment
    });

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

    const kotakData = await fetchKotakStatement();

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

    const statementText = await decryptAndExtractText({
        filePath: pdfPath,
        password: process.env.KOTAK_PDF_PASSWORD,
        bank: "Kotak"
    });

    const { statementMonth, statementYear } =
        extractKotakMonthYear(statementText);

    const amount = extractKotakAmount(statementText);

    const { currentInstallment, totalInstallments } =
        extractKotakInstallmentInfo(statementText);

    const { month: nextMonth, year: nextYear } =
        getNextMonthYear(statementMonth, statementYear);

    await updateKotakTracker({
        amount,
        month: nextMonth,
        year: nextYear,
        currentInstallment,
        totalInstallments
    });

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