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
cron.schedule("0 2 * * *", async () => {
    console.log("[CRON] EMI job started");
    await runStatementJob();
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// TEMPORARY — remove after first successful live run
app.get("/test-full-run", async (req, res) => {
    try {
        console.log("[TEST] Manual full run triggered");

        await runStatementJob();

        res.json({
            status: "SUCCESS",
            mode: process.env.DRY_RUN === "true" ? "DRY_RUN" : "LIVE_RUN"
        });
    } catch (err) {
        console.error("[TEST FULL RUN ERROR]", err);
        res.status(500).json({
            error: err.message
        });
    }
});