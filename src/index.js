import express from "express";
import cron from "node-cron";
import "dotenv/config";
import { runStatementJob } from "./jobs/statement.job.js";
import { google } from "googleapis";

const app = express();
const PORT = process.env.PORT || 3000;

// Health check (Railway needs this)
app.get("/health", (_, res) => {
    res.json({ status: "ok" });
});

// Cron placeholder (runs daily at 2 AM)
cron.schedule("0 2 * * *", async () => {
    console.log("[CRON] EMI job started");
    await runStatementJob();
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

app.get("/test-full-run", async (_, res) => {
    try {
        await runStatementJob();
        res.json({ status: "SUCCESS (DRY RUN)" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get("/test-auth-token", async (_, res) => {
    try {
        const auth = new google.auth.JWT(
            process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            null,
            process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
            ["https://www.googleapis.com/auth/spreadsheets"]
        );

        const token = await auth.authorize();
        res.json({
            success: true,
            tokenType: token.token_type
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});