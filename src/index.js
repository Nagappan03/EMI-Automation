import express from "express";
import cron from "node-cron";
import "dotenv/config";

const app = express();
const PORT = process.env.PORT || 3000;

// Health check (Railway needs this)
app.get("/health", (_, res) => {
    res.json({ status: "ok" });
});

// Cron placeholder (runs daily at 2 AM)
cron.schedule("0 2 * * *", async () => {
    console.log("[CRON] Job triggered");
    // Statement processing will go here
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});