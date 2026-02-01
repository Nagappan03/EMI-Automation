import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

export async function decryptAndExtractText({
    filePath,
    password,
    bank
}) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`[${bank}] PDF not found at ${filePath}`);
    }

    const decryptedPath = path.join("/tmp", `${bank}-decrypted.pdf`);

    // 1️⃣ Decrypt using qpdf
    try {
        execSync(
            `qpdf --password=${password} --decrypt "${filePath}" "${decryptedPath}"`,
            { stdio: "ignore" }
        );
    } catch {
        throw new Error(`[${bank}] PDF decryption failed (qpdf)`);
    }

    const decryptedBytes = new Uint8Array(
        fs.readFileSync(decryptedPath)
    );

    // 2️⃣ Extract text using pdfjs-dist (reliable)
    let extractedText = "";
    try {
        const loadingTask = pdfjsLib.getDocument({ data: decryptedBytes });
        const pdf = await loadingTask.promise;

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const content = await page.getTextContent();
            const pageText = content.items.map(i => i.str).join(" ");
            extractedText += pageText + "\n";
        }
    } catch (err) {
        throw new Error(`[${bank}] PDF text extraction failed (pdfjs)`);
    } finally {
        fs.unlinkSync(decryptedPath);
    }

    return normalizeText(extractedText);
}

function normalizeText(text) {
    return text
        .replace(/\r/g, "\n")
        .replace(/\n+/g, "\n")
        .replace(/[ ]{2,}/g, " ")
        .replace(/\t/g, " ")
        .trim();
}