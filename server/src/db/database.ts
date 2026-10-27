import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.resolve(__dirname, "../../data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "help_me_pay.db");
export const db = new Database(dbPath);

// Enable WAL mode and foreign keys for high-performance and relational integrity
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

export default db;
