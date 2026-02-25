import express from "express";
import cron from "node-cron";
import "dotenv/config";
import fs from "fs";
import path from "path";
import { runStatementJob } from "./jobs/statement.job.js";
import prisma from "./lib/prisma.js";

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

// Health check
app.get("/health", async (req, res) => {
    const runningJob = await prisma.jobRun.findFirst({
        where: { status: "RUNNING" }
    });

    res.json({
        status: "ok",
        running: !!runningJob,
        lastRun: await prisma.jobRun.findFirst({
            orderBy: { startedAt: "desc" }
        })
    });
});

// Cron placeholder (runs daily at 2 AM)
cron.schedule("30 20 * * *", async () => {
    try {
        const now = new Date().toISOString();
        console.log(`[CRON] EMI job triggered at ${now}`);

        await runStatementJob();

        console.log("[CRON] EMI job completed successfully");
    } catch (err) {
        console.error("[CRON ERROR]", err);
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Test DB connection
(async () => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        console.log("✅ Database connected");
    } catch (e) {
        console.error("❌ DB connection failed", e);
    }
})();

// Get all runs
app.get("/runs", async (req, res) => {
    const runs = await prisma.jobRun.findMany({
        orderBy: { startedAt: "desc" },
        take: 20
    });

    const formatted = runs.map(run => ({
        ...run,
        durationSeconds: run.completedAt
            ? Math.round((run.completedAt - run.startedAt) / 1000)
            : null
    }));

    res.json(formatted);
});

// Get a specific run with id
app.get("/runs/:id", async (req, res) => {
    const run = await prisma.jobRun.findUnique({
        where: { id: req.params.id }
    });

    res.json(run);
});

// Manual run
app.post("/run-now", async (req, res) => {
    try {
        const result = await runStatementJob("MANUAL");
        res.json({ status: result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get system summary
app.get("/system-summary", async (req, res) => {
    const totalRuns = await prisma.jobRun.count();

    const lastSuccess = await prisma.jobRun.findFirst({
        where: { status: "SUCCESS" },
        orderBy: { startedAt: "desc" }
    });

    const lastFailure = await prisma.jobRun.findFirst({
        where: { status: "FAILED" },
        orderBy: { startedAt: "desc" }
    });

    res.json({
        totalRuns,
        lastSuccess,
        lastFailure
    });
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