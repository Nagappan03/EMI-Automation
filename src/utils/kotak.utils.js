/**
 * Extract month and year from Kotak PDF
 * Example:
 * Statement Date 25-Jan-2026
 */
export function extractKotakMonthYear(text) {
    const match = text.match(/Statement Date\s+\d{1,2}-(\w{3})-(\d{4})/);

    if (!match) {
        throw new Error("[Kotak] Unable to extract month/year from Statement Date");
    }

    return {
        statementMonth: match[1],
        statementYear: match[2]
    };
}

/**
 * Extract EMI amount from Kotak PDF
 */
export function extractKotakAmount(text) {
    const match = text.match(/Total Payment Due\s+([\d,]+\.\d{2})/);

    if (!match) {
        throw new Error("[Kotak] Total Payment Due not found");
    }

    return parseFloat(match[1].replace(/,/g, ""));
}

/**
 * Extract installment info from Kotak statement
 * Example:
 * EMIPRINFORRELRETAILLTD(017/024)
 */
export function extractKotakInstallmentInfo(text) {
    const match = text.match(/\((\d{1,3})\/(\d{1,3})\)/);

    if (!match) {
        throw new Error("[Kotak] Installment info not found (e.g., (017/024))");
    }

    return {
        currentInstallment: Number(match[1]),   // removes leading zeros
        totalInstallments: Number(match[2])
    };
}