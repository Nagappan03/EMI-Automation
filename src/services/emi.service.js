/**
 * AXIS EMI CALCULATION
 */
export function calculateAxisEMI(statementText) {
    // 1. Extract Principal & Interest for REF# 65261897
    const principalRegex =
        /EMI PRINCIPAL\s*-\s*\d+\/\d+,\s*REF#\s*65261897.*?([\d,]+\.\d{2})/i;

    const interestRegex =
        /EMI INTEREST\s*-\s*\d+\/\d+,\s*REF#\s*65261897.*?([\d,]+\.\d{2})/i;

    const principalMatch = statementText.match(principalRegex);
    const interestMatch = statementText.match(interestRegex);

    if (!principalMatch || !interestMatch) {
        throw new Error("Axis EMI principal or interest not found for REF# 65261897");
    }

    const principal = parseAmount(principalMatch[1]);
    const interest = parseAmount(interestMatch[1]);

    // 2. Extract ALL GST values → pick max
    const gstRegex = /\bGST\b\s*([\d,]+\.\d{2})/gi;
    const gstValues = [];

    let match;
    while ((match = gstRegex.exec(statementText)) !== null) {
        gstValues.push(parseAmount(match[1]));
    }

    if (!gstValues.length) {
        throw new Error("No GST values found in Axis statement");
    }

    const maxGST = Math.max(...gstValues);

    return {
        principal,
        interest,
        gst: maxGST,
        totalEMI: round(principal + interest + maxGST)
    };
}

/**
 * KOTAK EMI CALCULATION
 */
export function calculateKotakEMI(statementText) {
    const principalRegex = /EMI PRINCIPAL.*?([\d,]+\.\d{2})/i;
    const interestRegex = /EMI INTEREST.*?([\d,]+\.\d{2})/i;
    const gstRegex = /\bGST\b\s*([\d,]+\.\d{2})/i;

    const principalMatch = statementText.match(principalRegex);
    const interestMatch = statementText.match(interestRegex);
    const gstMatch = statementText.match(gstRegex);

    if (!principalMatch || !interestMatch || !gstMatch) {
        throw new Error("Kotak EMI components missing");
    }

    const principal = parseAmount(principalMatch[1]);
    const interest = parseAmount(interestMatch[1]);
    const gst = parseAmount(gstMatch[1]);

    return {
        principal,
        interest,
        gst,
        totalEMI: round(principal + interest + gst)
    };
}

/**
 * HELPERS
 */
function parseAmount(value) {
    return parseFloat(value.replace(/,/g, ""));
}

function round(num) {
    return Math.round(num * 100) / 100;
}