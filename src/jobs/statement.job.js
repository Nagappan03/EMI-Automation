import { fetchAxisStatement } from "../services/gmail.service.js";
import { decryptAndExtractText } from "../services/pdf.service.js";
import { updateAxisTracker } from "../services/sheets.service.js";

import { extractAxisInstallmentInfo } from "../utils/axis.utils.js";
import { getNextMonthYear } from "../utils/date.utils.js";

import {
    isStatementProcessed,
    markStatementProcessed
} from "../services/idempotency.service.js";

/**
 * Main job entry point
 * This is what /test-full-run and cron will call
 */
export async function runStatementJob() {
    console.log("[JOB] Statement job started");

    // ===============================
    // AXIS BANK FLOW (ONLY)
    // ===============================
    await processAxisStatement();

    console.log("[JOB] Statement job completed");
}

/**
 * Process Axis Bank credit card statement
 */
async function processAxisStatement() {
    console.log("[AXIS] Processing Axis Bank statement");

    // 1. Fetch Axis statement email + metadata
    const axisData = await fetchAxisStatement();

    if (!axisData) {
        console.log("[AXIS] No Axis statement found. Skipping.");
        return;
    }

    const {
        statementKey,
        pdfPath,
        statementMonth,
        statementYear
    } = axisData;

    // 2. Idempotency check
    if (await isStatementProcessed(statementKey)) {
        console.log(`[AXIS] Statement already processed: ${statementKey}`);
        return;
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
    await markStatementProcessed(statementKey);

    console.log(`[AXIS] Successfully processed statement ${statementKey}`);
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