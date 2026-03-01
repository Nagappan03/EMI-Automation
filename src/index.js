import express from "express";
import cron from "node-cron";
import "dotenv/config";
import fs from "fs";
import path from "path";
import { runStatementJob } from "./jobs/statement.job.js";
import prisma from "./lib/prisma.js";
import { runMonthlyNotification } from "./services/monthlyNotification.service.js";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

// Serve frontend static files
const publicPath = path.join(__dirname, "../public");
app.use(express.static(publicPath));

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

function requireAdmin(req, res, next) {
    const password = req.headers["x-admin-password"];

    if (!password || password !== process.env.ADMIN_PASSWORD) {
        return res.status(403).json({ error: "Unauthorized" });
    }

    next();
}

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

// Cron for statement job (runs daily at 2 AM)
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

// Cron for monthly notification (runs daily at 9 AM)
cron.schedule("30 3 * * *", async () => {
    console.log("[CRON] Monthly notification check");
    await runMonthlyNotification();
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

// admin password check
app.post("/api/admin/verify", requireAdmin, (req, res) => {
    res.json({ status: "OK" });
});

// Get all runs
app.get("/api/runs", async (req, res) => {
    const runs = await prisma.jobRun.findMany({
        orderBy: { startedAt: "desc" },
        take: 50
    });

    const formatted = runs.map(run => ({
        ...run,
        durationSeconds: run.completedAt
            ? Math.round(
                (new Date(run.completedAt) - new Date(run.startedAt)) / 1000
            )
            : null
    }));

    res.json(formatted);
});

// Get a specific run with id
app.get("/api/runs/:id", async (req, res) => {
    const run = await prisma.jobRun.findUnique({
        where: { id: req.params.id }
    });

    res.json(run);
});

// Manual run
app.post("/api/run-now", requireAdmin, async (req, res) => {
    try {
        const result = await runStatementJob("MANUAL");
        res.json({ status: result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post("/api/test-monthly-notifications", requireAdmin, async (req, res) => {
    try {
        console.log("[TEST] Manual monthly notification triggered");

        await runMonthlyNotification({ force: true }, "MANUAL");

        res.json({ status: "SUCCESS" });
    } catch (err) {
        console.error("[TEST MONTHLY ERROR]", err);
        res.status(500).json({ error: err.message });
    }
});

// Get system summary
app.get("/api/system-summary", async (req, res) => {
    const totalRuns = await prisma.jobRun.count();

    const emailEnabled = true;

    const whatsappEnabled = false;

    const lastRun = await prisma.jobRun.findFirst({
        orderBy: { startedAt: "desc" }
    });

    const lastSuccess = await prisma.jobRun.findFirst({
        where: { status: "SUCCESS" },
        orderBy: { startedAt: "desc" }
    });

    const lastFailure = await prisma.jobRun.findFirst({
        where: { status: "FAILED" },
        orderBy: { startedAt: "desc" }
    });

    const running = await prisma.jobRun.findFirst({
        where: { status: "RUNNING" },
        orderBy: { startedAt: "desc" }
    });

    let overallStatus = "UNKNOWN";

    if (running) {
        overallStatus = "RUNNING";
    } else if (lastRun?.status === "FAILED") {
        overallStatus = "FAILED";
    } else if (lastRun?.status === "SUCCESS") {
        overallStatus = "SUCCESS";
    }

    // -------- Monthly Notification Logic --------
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const monthly = await prisma.monthlyNotification.findFirst({
        where: { month, year, type: "EMAIL" },
        orderBy: { startedAt: "desc" }
    });

    let monthlyStatus = "PENDING";

    if (monthly?.status === "SUCCESS") {
        monthlyStatus = "SUCCESS";
    } else if (monthly?.status === "FAILED") {
        monthlyStatus = "FAILED";
    } else if (monthly?.status === "RUNNING") {
        monthlyStatus = "RUNNING";
    }

    res.json({
        totalRuns,
        overallStatus,
        lastRun,
        lastSuccess,
        lastFailure,
        running,
        monthlyNotificationStatus: monthlyStatus,
        axisStatus: lastRun?.axisStatus || "UNKNOWN",
        kotakStatus: lastRun?.kotakStatus || "UNKNOWN",
        lastRunTime: lastRun?.startedAt || null,
        emailEnabled,
        whatsappEnabled
    });
});

app.get("/api/system-details", async (req, res) => {
    const uptimeSeconds = process.uptime();

    const dbConnected = await prisma.$queryRaw`SELECT 1`
        .then(() => true)
        .catch(() => false);

    res.json({
        api: {
            status: "ONLINE",
            uptimeSeconds
        },

        database: {
            connected: dbConnected
        },

        notifications: {
            emailEnabled: !!process.env.EMAIL_RECIPIENTS,
            whatsappEnabled: !!process.env.TWILIO_WHATSAPP_TEMPLATE_SID,
            whatsappRecipients: process.env.WHATSAPP_RECIPIENTS
                ? process.env.WHATSAPP_RECIPIENTS.split(",").length
                : 0
        },

        system: {
            nodeVersion: process.version,
            environment: process.env.NODE_ENV,
            memoryUsageMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
            serverTime: new Date()
        }
    });
});

// Catch-all for React Router
app.use((req, res) => {
    res.sendFile(path.join(__dirname, "../public", "index.html"));
});