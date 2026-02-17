import express from "express";
import cron from "node-cron";
import "dotenv/config";
import fs from "fs";
import path from "path";
import { runStatementJob } from "./jobs/statement.job.js";

const app = express();
const PORT = process.env.PORT || 3000;

const saJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

if (!saJson) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is missing");
}

const saPath = path.join("/tmp", "google-service-account.json");

// Write only once
if (!fs.existsSync(saPath)) {
    fs.writeFileSync(saPath, saJson);
}

// Point Google SDK to the file
process.env.GOOGLE_APPLICATION_CREDENTIALS = saPath;

console.log("Google credentials written to:", saPath);

// Health check (Railway needs this)
app.get("/health", (_, res) => {
    res.json({ status: "ok" });
});

// Cron placeholder (runs daily at 2 AM)
cron.schedule("30 20 * * *", async () => {
    try {
        const now = new Date().toISOString();
        console.log(`[CRON] EMI job triggered at ${now}`);

        fs.writeFileSync("/tmp/last-cron-run.txt", now);

        await runStatementJob();

        console.log("[CRON] EMI job completed successfully");
    } catch (err) {
        console.error("[CRON ERROR]", err);
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// endpoint to test when the cron job was last run
app.get("/last-cron-run", (req, res) => {
    try {
        const data = fs.readFileSync("/tmp/last-cron-run.txt", "utf8");
        res.json({ lastCronRun: data });
    } catch {
        res.json({ lastCronRun: null });
    }
});