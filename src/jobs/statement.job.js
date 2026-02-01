import { fetchLatestStatement } from "../services/gmail.service.js";
import { decryptAndExtractText } from "../services/pdf.service.js";
import { calculateAxisEMI, calculateKotakEMI } from "../services/emi.service.js";
import { isProcessed, markProcessed } from "../db/index.js";
import { updateTracker } from "../services/sheets.service.js";
import { sendNotification } from "../services/notify.service.js";

export async function runStatementJob() {
    // AXIS
    await processBank({
        bank: "Axis",
        card: "5851",
        password: process.env.AXIS_PDF_PASSWORD,
        calculator: calculateAxisEMI
    });

    // KOTAK (add later when ready)
}

async function processBank({
    bank,
    card,
    password,
    calculator
}) {
    const pdfPath = await fetchLatestStatement(bank);
    const text = await decryptAndExtractText({ filePath: pdfPath, password, bank });

    const { totalEMI } = calculator(text);

    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    if (await isProcessed(bank, card, yearMonth)) {
        console.log(`[SKIP] ${bank} ${yearMonth} already processed`);
        return;
    }

    if (process.env.DRY_RUN === "true") {
        console.log("[DRY RUN] Would update tracker:", totalEMI);
    } else {
        // Only proceed updating if DRY_RUN is false
        await updateTracker({
            bank,
            month: now.toLocaleString("en-US", { month: "short" }),
            year: String(now.getFullYear()),
            amount: totalEMI
        });

        await markProcessed(bank, card, yearMonth);

        await sendNotification({
            bank,
            amount: totalEMI,
            month: now.toLocaleString("en-US", { month: "long" }),
            year: now.getFullYear()
        });
    }
}