/**
 * Extract HSBC installment info (dynamic, merchant-based)
 */
export function extractHsbcInstallmentInfo(text, merchantName = "FORERUN SYSTEMS") {

    const chunks = text.split(/(?=\d{2}[A-Z]{3})/g);

    let ref = null;
    let currentInstallment = null;
    let totalInstallments = null;

    for (const chunk of chunks) {

        if (
            chunk.toUpperCase().includes(merchantName.toUpperCase()) &&
            chunk.includes("INSTALLMENTS")
        ) {

            // Extract REF
            const refMatch = chunk.match(/CC\d{11}/);
            if (refMatch) {
                ref = refMatch[0];
            }

            // Extract installment info
            const instMatch = chunk.match(/(\d+)(?:ST|ND|RD|TH) OF (\d+) INSTALLMENTS/i);

            if (instMatch) {
                currentInstallment = Number(instMatch[1]);
                totalInstallments = Number(instMatch[2]);
            }

            // Stop once found valid data
            if (ref && currentInstallment && totalInstallments) {
                break;
            }
        }
    }

    if (!ref || !currentInstallment || !totalInstallments) {
        throw new Error("[HSBC] Installment info not found");
    }

    console.log(`[HSBC] Extracted REF: ${ref}`);
    console.log(`[HSBC] Installment: ${currentInstallment}/${totalInstallments}`);

    return {
        ref,
        currentInstallment,
        totalInstallments
    };
}

/**
 * Extract HSBC EMI amount (principal + interest + GST)
 */
export function extractHsbcEmiAmount(text, ref, merchantName = "FORERUN SYSTEMS") {

    const chunks = text.split(/(?=\d{2}[A-Z]{3})/g);

    let principal = null;
    let interest = null;
    let gst = null;

    for (const chunk of chunks) {

        // Only process relevant merchant + ref
        if (
            chunk.includes(ref) &&
            chunk.toUpperCase().includes(merchantName.toUpperCase())
        ) {

            // Skip duplicate CR entries
            if (chunk.includes(" CR ")) continue;

            const numbers = chunk.match(/[\d,]+\.\d{2}/g);
            const amount = numbers?.[0]
                ? parseFloat(numbers[0].replace(/,/g, ""))
                : null;

            if (!amount) continue;

            if (/PRINCIPAL/i.test(chunk)) {
                principal = amount;
            }

            if (/INTEREST/i.test(chunk)) {
                interest = amount;
            }
        }
    }

    // GST (outside merchant chunks)
    const gstMatch = text.match(
        new RegExp(`IGST ASSESSMENT @18\\.00%\\s+${ref}\\s+([\\d,]+\\.\\d{2})`, "i")
    );

    if (gstMatch) {
        gst = parseFloat(gstMatch[1].replace(/,/g, ""));
    }

    if (!principal || !interest || !gst) {
        throw new Error("[HSBC] EMI components missing");
    }

    const total = Number((principal + interest + gst).toFixed(2));

    console.log(
        `[HSBC] EMI calculated → Principal: ${principal}, Interest: ${interest}, GST: ${gst}, Total: ${total}`
    );

    return {
        principal,
        interest,
        gst,
        total
    };
}