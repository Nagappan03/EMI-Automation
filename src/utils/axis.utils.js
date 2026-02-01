/**
 * Extract current and total EMI installments for Axis Bank
 * Example line:
 * "EMI PRINCIPAL - 2/12, REF# 65261897"
 */
export function extractAxisInstallmentInfo(text) {
    const match = text.match(
        /EMI (?:PRINCIPAL|INTEREST) - (\d+)\/(\d+), REF# 65261897/
    );

    if (!match) {
        throw new Error("[Axis] Installment info not found for REF# 65261897");
    }

    return {
        currentInstallment: Number(match[1]),
        totalInstallments: Number(match[2])
    };
}