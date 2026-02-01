import { google } from "googleapis";

export async function updateTracker({ bank, month, year, amount }) {
    const auth = new google.auth.GoogleAuth({
        scopes: ["https://www.googleapis.com/auth/spreadsheets"]
    });

    const sheets = google.sheets({
        version: "v4",
        auth
    });

    const range = "Tracker!A2:Z1000";

    const res = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range
    });

    const rows = res.data.values || [];

    const rowIndex = rows.findIndex(
        r => r[1] === bank && r[3] === month && r[4] === year
    );

    if (rowIndex === -1) {
        throw new Error(`Tracker row not found for ${bank} ${month}-${year}`);
    }

    const targetRow = rowIndex + 2;

    await sheets.spreadsheets.values.update({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: `Tracker!F${targetRow}:J${targetRow}`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
            values: [[amount, "", "", "Pending", "Pending"]]
        }
    });
}