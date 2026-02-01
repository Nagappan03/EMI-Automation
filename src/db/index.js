import sqlite3 from "sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "emi.db");

export const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    db.run(`
    CREATE TABLE IF NOT EXISTS processed_statements (
      bank TEXT,
      card_last4 TEXT,
      year_month TEXT,
      processed_at TEXT,
      PRIMARY KEY (bank, card_last4, year_month)
    )
  `);
});

export function isProcessed(bank, card, yearMonth) {
    return new Promise((resolve, reject) => {
        db.get(
            `SELECT 1 FROM processed_statements WHERE bank=? AND card_last4=? AND year_month=?`,
            [bank, card, yearMonth],
            (err, row) => {
                if (err) reject(err);
                resolve(!!row);
            }
        );
    });
}

export function markProcessed(bank, card, yearMonth) {
    return new Promise((resolve, reject) => {
        db.run(
            `INSERT INTO processed_statements VALUES (?, ?, ?, ?)`,
            [bank, card, yearMonth, new Date().toISOString()],
            err => (err ? reject(err) : resolve())
        );
    });
}