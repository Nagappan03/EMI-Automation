import { google } from "googleapis";

export async function updateAxisTracker({
    amount,
    statementMonth,
    statementYear,
    currentInstallment,
    totalInstallments
}) {
    const auth = new google.auth.GoogleAuth({
        scopes: ["https://www.googleapis.com/auth/spreadsheets"]
    });

    const sheets = google.sheets({ version: "v4", auth });

    const sheetId = process.env.GOOGLE_SHEET_ID;
    const range = "Tracker!A2:Z1000";

    const res = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range
    });

    const rows = res.data.values || [];

    // Find Axis row (bank column)
    const rowIndex = rows.findIndex(r => r[1] === "Axis");

    if (rowIndex === -1) {
        throw new Error("Axis row not found in tracker");
    }

    const targetRow = rowIndex + 2;

    // Compute next month/year (T + 1)
    const { month: nextMonth, year: nextYear } =
        getNextMonthYear(statementMonth, statementYear);

    await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `Tracker!D${targetRow}:J${targetRow}`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
            values: [[
                nextMonth,                  // Month
                nextYear,                   // Year
                amount,                     // Amount
                totalInstallments,          // Total Installments
                currentInstallment,         // Current Installment
                "Pending",                  // Payment Status
            ]]
        }
    });
}