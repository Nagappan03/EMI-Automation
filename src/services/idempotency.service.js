import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// Ensure persistent directory exists
const DATA_DIR = "/tmp/emi-data";
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// SQLite DB path
const dbPath = path.join(DATA_DIR, "idempotency.db");

// Initialize DB
const db = new Database(dbPath);

// Create table if not exists
db.prepare(`
  CREATE TABLE IF NOT EXISTS processed_statements (
    statement_key TEXT PRIMARY KEY,
    processed_at TEXT NOT NULL
  )
`).run();

/**
 * Check if a statement has already been processed
 */
export async function isStatementProcessed(statementKey) {
    const row = db
        .prepare(
            `SELECT 1 FROM processed_statements WHERE statement_key = ?`
        )
        .get(statementKey);

    return !!row;
}

/**
 * Mark a statement as processed
 */
export async function markStatementProcessed(statementKey) {
    db.prepare(
        `
    INSERT INTO processed_statements (statement_key, processed_at)
    VALUES (?, datetime('now'))
    `
    ).run(statementKey);
}