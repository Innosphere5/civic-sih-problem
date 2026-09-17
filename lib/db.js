const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

let _db = null;

/**
 * Returns a singleton better-sqlite3 database instance.
 * Creates the data/ directory and complaints table if they don't exist.
 */
function getDb() {
  if (_db) return _db;

  const dbPath = path.resolve(process.env.DATABASE_PATH || "./data/complaints.db");
  const dir = path.dirname(dbPath);

  // Ensure the data directory exists
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  _db = new Database(dbPath);

  // Enable WAL mode for better concurrent read performance
  _db.pragma("journal_mode = WAL");

  // Create the complaints table if it doesn't exist
  _db.exec(`
    CREATE TABLE IF NOT EXISTS complaints (
      complaint_id    TEXT PRIMARY KEY,
      complaint_text  TEXT NOT NULL,
      locality        TEXT,
      contact         TEXT,
      language        TEXT DEFAULT 'en',
      category        TEXT NOT NULL,
      confidence      REAL,
      department      TEXT NOT NULL,
      sla_hours       INTEGER NOT NULL,
      status          TEXT NOT NULL DEFAULT 'Open',
      acknowledgement TEXT,
      officer_override INTEGER DEFAULT 0,
      override_reason TEXT,
      image_path      TEXT,
      created_at      TEXT NOT NULL,
      updated_at      TEXT NOT NULL
    )
  `);

  return _db;
}

module.exports = { getDb };
