import { db } from "./database.js";

export function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      handle TEXT NOT NULL UNIQUE,
      avatar TEXT,
      bio TEXT,
      total_paid INTEGER NOT NULL DEFAULT 0,
      bills_sponsored INTEGER NOT NULL DEFAULT 0,
      followers_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
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
  `);
}
