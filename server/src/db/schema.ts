import { db } from "./database.js";

export function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      handle TEXT NOT NULL UNIQUE,
      email TEXT,
      phone TEXT,
      password_hash TEXT,
      avatar TEXT,
      bio TEXT,
      total_paid INTEGER NOT NULL DEFAULT 0,
      bills_sponsored INTEGER NOT NULL DEFAULT 0,
      followers_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS wishes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      tag TEXT NOT NULL,
      category TEXT NOT NULL,
      img TEXT,
      raised INTEGER NOT NULL DEFAULT 0,
      goal INTEGER NOT NULL,
      likes_count INTEGER NOT NULL DEFAULT 0,
      comments_count INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      is_friend INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      deleted_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS likes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      wish_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, wish_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (wish_id) REFERENCES wishes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS saves (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      wish_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, wish_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (wish_id) REFERENCES wishes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      wish_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (wish_id) REFERENCES wishes(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reactions (
      id TEXT PRIMARY KEY,
      wish_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      emoji TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, wish_id, emoji),
      FOREIGN KEY (wish_id) REFERENCES wishes(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS follows (
      follower_id TEXT NOT NULL,
      following_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (follower_id, following_id),
      FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      wish_id TEXT NOT NULL,
      sponsor_id TEXT NOT NULL,
      sponsor_name TEXT NOT NULL,
      sponsor_handle TEXT NOT NULL,
      amount INTEGER NOT NULL,
      payment_method TEXT NOT NULL,
      payment_reference TEXT,
      message TEXT,
      is_anonymous INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'completed',
      idempotency_key TEXT UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (wish_id) REFERENCES wishes(id) ON DELETE CASCADE,
      FOREIGN KEY (sponsor_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      actor_id TEXT NOT NULL,
      actor_name TEXT NOT NULL,
      actor_avatar TEXT,
      type TEXT NOT NULL,
      wish_id TEXT,
      wish_title TEXT,
      amount INTEGER,
      text TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      sender_id TEXT NOT NULL,
      recipient_id TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS stories (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      avatar_name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      wish_id TEXT NOT NULL,
      reporter_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      details TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (wish_id) REFERENCES wishes(id) ON DELETE CASCADE,
      FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Indexes for fast queries
    CREATE INDEX IF NOT EXISTS idx_wishes_category ON wishes(category);
    CREATE INDEX IF NOT EXISTS idx_wishes_created_at ON wishes(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_wishes_user_id ON wishes(user_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_wish_id ON transactions(wish_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_sponsor_id ON transactions(sponsor_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_messages_pair ON messages(sender_id, recipient_id, created_at ASC);
    CREATE INDEX IF NOT EXISTS idx_likes_user_wish ON likes(user_id, wish_id);
    CREATE INDEX IF NOT EXISTS idx_saves_user_wish ON saves(user_id, wish_id);
    CREATE INDEX IF NOT EXISTS idx_reactions_wish ON reactions(wish_id);
    CREATE INDEX IF NOT EXISTS idx_reports_wish ON reports(wish_id);
  `);

  // Migrate existing tables gracefully if columns were added later
  const migrateColumn = (table: string, column: string, def: string) => {
    try {
      const info = db.prepare(`PRAGMA table_info(${table})`).all() as any[];
      const exists = info.some((col) => col.name === column);
      if (!exists) {
        db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${def}`);
      }
    } catch (e) {
      console.warn(`Migration notice for ${table}.${column}:`, e);
    }
  };

  migrateColumn("users", "password_hash", "TEXT");
  migrateColumn("users", "email", "TEXT");
  migrateColumn("users", "phone", "TEXT");
  migrateColumn("users", "updated_at", "TEXT");
  migrateColumn("wishes", "updated_at", "TEXT");
  migrateColumn("wishes", "deleted_at", "TEXT");
  migrateColumn("wishes", "provider_name", "TEXT");
  migrateColumn("wishes", "bill_reference", "TEXT");
  migrateColumn("wishes", "verification_status", "TEXT");
  migrateColumn("transactions", "updated_at", "TEXT");
  migrateColumn("transactions", "order_id", "TEXT");
  migrateColumn("transactions", "refund_reason", "TEXT");

  // Backfill sample provider credentials on existing wishes if empty
  try {
    db.prepare(`
      UPDATE wishes SET 
        provider_name = CASE id
          WHEN 'wish_1' THEN 'Nike Flagship Store'
          WHEN 'wish_2' THEN 'Ciao Bella Trattoria'
          WHEN 'wish_3' THEN 'Apple Authorized Imagine'
          WHEN 'wish_4' THEN 'Urban Nest Co-Living PG'
          WHEN 'wish_5' THEN 'Clove Dental Care Copay'
          WHEN 'wish_6' THEN 'VCA Pet Emergency Clinic'
          WHEN 'wish_7' THEN 'ACT Fibernet Utilities'
          WHEN 'wish_8' THEN 'Indie Stage Mumbai'
          WHEN 'wish_9' THEN 'BigBasket Community Pantry'
          WHEN 'wish_10' THEN 'Uber Green Transit'
          ELSE 'Direct Merchant Verified'
        END,
        bill_reference = 'INV-2026-' || SUBSTR(id, 6) || '99',
        verification_status = 'verified'
      WHERE provider_name IS NULL
    `).run();
  } catch (err) {
    console.warn("Provider backfill notice:", err);
  }
}
