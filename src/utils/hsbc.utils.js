export function extractHsbcInstallmentInfo(text) {

    const ref = "CC26047002764";

    const regex = new RegExp(
        `${ref}.*?(\\d+)(?:ST|ND|RD|TH) OF (\\d+) INSTALLMENTS`,
        "i"
    );

    const match = text.match(regex);

    if (!match) {
        throw new Error("[HSBC] Installment info not found for reference " + ref);
    }

    return {
        currentInstallment: Number(match[1]),
        totalInstallments: Number(match[2])
    };
}


export function extractHsbcEmiAmount(text) {

    const ref = "CC26047002764";

    const principalMatch = text.match(
        new RegExp(`${ref}\\s+([\\d,]+\\.\\d{2})(?!\\s+CR)\\s+\\d+(?:ST|ND|RD|TH) OF \\d+ INSTALLMENTS PRINCIPAL`, "i")
    );

    const interestMatch = text.match(
        new RegExp(`${ref}\\s+([\\d,]+\\.\\d{2})(?!\\s+CR)\\s+\\d+(?:ST|ND|RD|TH) OF \\d+ INSTALLMENTS INTEREST`, "i")
    );

    const gstMatch = text.match(
        new RegExp(`IGST ASSESSMENT @18\\.00%\\s+${ref}\\s+([\\d,]+\\.\\d{2})(?!\\s+CR)`, "i")
    );

    if (!principalMatch || !interestMatch || !gstMatch) {
        throw new Error("[HSBC] EMI components missing");
    }

    const principal = parseFloat(principalMatch[1].replace(/,/g, ""));
    const interest = parseFloat(interestMatch[1].replace(/,/g, ""));
    const gst = parseFloat(gstMatch[1].replace(/,/g, ""));

    const total = Number((principal + interest + gst).toFixed(2));

    console.log(
        `[HSBC] EMI calculated → Principal: ${principal}, Interest: ${interest}, GST: ${gst}, Total: ${total}`
    );

    return total;
}