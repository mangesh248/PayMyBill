import { Router, Request, Response } from "express";
import { db } from "../db/database.js";
import { v4 as uuidv4 } from "uuid";

export const wishesRouter = Router();

// Current logged in user ID (can be expanded to session / JWT)
const CURRENT_USER_ID = "user_you";

// GET /api/wishes
wishesRouter.get("/", (req: Request, res: Response) => {
  try {
    const { category, tab, q, userId } = req.query;

    let query = `
      SELECT 
        w.*,
        u.name as user_name,
        u.handle as user_handle,
        u.avatar as user_avatar,
        EXISTS(SELECT 1 FROM likes l WHERE l.wish_id = w.id AND l.user_id = ?) as liked,
        EXISTS(SELECT 1 FROM saves s WHERE s.wish_id = w.id AND s.user_id = ?) as saved
      FROM wishes w
      JOIN users u ON w.user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [CURRENT_USER_ID, CURRENT_USER_ID];

    if (userId) {
      query += ` AND w.user_id = ?`;
      params.push(userId);
    }

    if (category && category !== "All") {
      query += ` AND (w.category = ? OR w.tag = ?)`;
      params.push(category, category);
    }

    if (tab === "Friends") {
      query += ` AND w.is_friend = 1`;
    }

    if (q) {
      const searchTerm = `%${String(q).trim()}%`;
      query += ` AND (w.title LIKE ? OR w.body LIKE ? OR w.tag LIKE ? OR u.name LIKE ? OR u.handle LIKE ?)`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    query += ` ORDER BY w.created_at DESC`;

    const rawRows = db.prepare(query).all(...params) as any[];

    const formatted = rawRows.map((r) => ({
      id: r.id,
      user_id: r.user_id,
      name: r.user_name,
      handle: r.user_handle,
      avatar: r.user_avatar,
      title: r.title,
      body: r.body,
      tag: r.tag,
      category: r.category,
      img: r.img,
      raised: r.raised,
      goal: r.goal,
      likes: r.likes_count,
      comments: r.comments_count,
      status: r.status,
      liked: Boolean(r.liked),
      saved: Boolean(r.saved),
      time: formatRelativeTime(r.created_at),
      created_at: r.created_at,
    }));

    res.json(formatted);
  } catch (error: any) {
    console.error("Error fetching wishes:", error);
    res.status(500).json({ error: "Failed to fetch wishes", details: error.message });
  }
});

// GET /api/wishes/:id
wishesRouter.get("/:id", (req: Request, res: Response) => {
  try {
    const wish = db.prepare(`
      SELECT 
        w.*,
        u.name as user_name,
        u.handle as user_handle,
        u.avatar as user_avatar,
        EXISTS(SELECT 1 FROM likes l WHERE l.wish_id = w.id AND l.user_id = ?) as liked,
        EXISTS(SELECT 1 FROM saves s WHERE s.wish_id = w.id AND s.user_id = ?) as saved
      FROM wishes w
      JOIN users u ON w.user_id = u.id
      WHERE w.id = ?
    `).get(CURRENT_USER_ID, CURRENT_USER_ID, req.params.id) as any;

    if (!wish) {
      res.status(404).json({ error: "Wish not found" });
      return;
    }

    // Get comments
    const comments = db.prepare(`
      SELECT c.*, u.name as user_name, u.handle as user_handle, u.avatar as user_avatar
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.wish_id = ?
      ORDER BY c.created_at ASC
    `).all(req.params.id) as any[];

    // Get sponsors/contributors
    const sponsors = db.prepare(`
      SELECT id, sponsor_name, sponsor_handle, amount, message, created_at
      FROM transactions
      WHERE wish_id = ? AND status = 'completed'
      ORDER BY created_at DESC
    `).all(req.params.id) as any[];

    res.json({
      ...wish,
      name: wish.user_name,
      handle: wish.user_handle,
      avatar: wish.user_avatar,
      liked: Boolean(wish.liked),
      saved: Boolean(wish.saved),
      time: formatRelativeTime(wish.created_at),
      comments: comments.map(c => ({
        ...c,
        time: formatRelativeTime(c.created_at)
      })),
      sponsors,
    });
  } catch (error: any) {
    console.error("Error fetching single wish:", error);
    res.status(500).json({ error: "Failed to fetch wish", details: error.message });
  }
});

// POST /api/wishes
wishesRouter.post("/", (req: Request, res: Response) => {
  try {
    const { title, body, tag, category, goal, img } = req.body;

    if (!title || !body || !goal) {
      res.status(400).json({ error: "Title, description, and goal amount are required" });
      return;
    }

    const numGoal = parseInt(goal, 10);
    if (isNaN(numGoal) || numGoal <= 0) {
      res.status(400).json({ error: "Goal amount must be a positive number" });
      return;
    }

    const newId = `wish_${uuidv4().slice(0, 8)}`;
    const categoryName = category || "Everyday Wish";
    const tagName = tag ? tag.toUpperCase() : categoryName.toUpperCase();
    const defaultImg = img || "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&w=1000&q=80";

    db.prepare(`
      INSERT INTO wishes (id, user_id, title, body, tag, category, img, raised, goal, likes_count, comments_count, status, is_friend)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, 0, 0, 'active', 1)
    `).run(newId, CURRENT_USER_ID, title.trim(), body.trim(), tagName, categoryName, defaultImg, numGoal);

    const created = db.prepare(`
      SELECT 
        w.*,
        u.name as user_name,
        u.handle as user_handle,
        u.avatar as user_avatar
      FROM wishes w
      JOIN users u ON w.user_id = u.id
      WHERE w.id = ?
    `).get(newId) as any;

    res.status(201).json({
      ...created,
      name: created.user_name,
      handle: created.user_handle,
      avatar: created.user_avatar,
      liked: false,
      saved: false,
      time: "Just now",
    });
  } catch (error: any) {
    console.error("Error creating wish:", error);
    res.status(500).json({ error: "Failed to create wish", details: error.message });
  }
});

// DELETE /api/wishes/:id
wishesRouter.delete("/:id", (req: Request, res: Response) => {
  try {
    const wish = db.prepare("SELECT * FROM wishes WHERE id = ?").get(req.params.id) as any;
    if (!wish) {
      res.status(404).json({ error: "Wish not found" });
      return;
    }

    db.prepare("DELETE FROM wishes WHERE id = ?").run(req.params.id);
    res.json({ success: true, message: "Wish deleted" });
  } catch (error: any) {
    console.error("Error deleting wish:", error);
    res.status(500).json({ error: "Failed to delete wish", details: error.message });
  }
});

// POST /api/wishes/:id/like
wishesRouter.post("/:id/like", (req: Request, res: Response) => {
  try {
    const wishId = req.params.id;
    const existing = db.prepare("SELECT id FROM likes WHERE user_id = ? AND wish_id = ?").get(CURRENT_USER_ID, wishId) as any;

    let liked = false;
    if (existing) {
      db.prepare("DELETE FROM likes WHERE id = ?").run(existing.id);
      db.prepare("UPDATE wishes SET likes_count = MAX(0, likes_count - 1) WHERE id = ?").run(wishId);
      liked = false;
    } else {
      db.prepare("INSERT INTO likes (id, user_id, wish_id) VALUES (?, ?, ?)").run(`like_${uuidv4().slice(0, 8)}`, CURRENT_USER_ID, wishId);
      db.prepare("UPDATE wishes SET likes_count = likes_count + 1 WHERE id = ?").run(wishId);
      liked = true;

      // Add notification to wish owner
      const wish = db.prepare("SELECT user_id, title FROM wishes WHERE id = ?").get(wishId) as any;
      if (wish && wish.user_id !== CURRENT_USER_ID) {
        const currentUser = db.prepare("SELECT name, avatar FROM users WHERE id = ?").get(CURRENT_USER_ID) as any;
        db.prepare(`
          INSERT INTO notifications (id, user_id, actor_id, actor_name, actor_avatar, type, wish_id, wish_title, text)
          VALUES (?, ?, ?, ?, ?, 'like', ?, ?, ?)
        `).run(
          `notif_${uuidv4().slice(0, 8)}`,
          wish.user_id,
          CURRENT_USER_ID,
          currentUser?.name || "Someone",
          currentUser?.avatar || "Y",
          wishId,
          wish.title,
          `liked your wish “${wish.title}”`
        );
      }
    }

    const updated = db.prepare("SELECT likes_count FROM wishes WHERE id = ?").get(wishId) as any;
    res.json({ liked, likes: updated?.likes_count ?? 0 });
  } catch (error: any) {
    console.error("Error toggling like:", error);
    res.status(500).json({ error: "Failed to toggle like", details: error.message });
  }
});

// POST /api/wishes/:id/save
wishesRouter.post("/:id/save", (req: Request, res: Response) => {
  try {
    const wishId = req.params.id;
    const existing = db.prepare("SELECT id FROM saves WHERE user_id = ? AND wish_id = ?").get(CURRENT_USER_ID, wishId) as any;

    let saved = false;
    if (existing) {
      db.prepare("DELETE FROM saves WHERE id = ?").run(existing.id);
      saved = false;
    } else {
      db.prepare("INSERT INTO saves (id, user_id, wish_id) VALUES (?, ?, ?)").run(`save_${uuidv4().slice(0, 8)}`, CURRENT_USER_ID, wishId);
      saved = true;
    }

    res.json({ saved });
  } catch (error: any) {
    console.error("Error toggling save:", error);
    res.status(500).json({ error: "Failed to toggle save", details: error.message });
  }
});

// GET /api/wishes/:id/comments
wishesRouter.get("/:id/comments", (req: Request, res: Response) => {
  try {
    const comments = db.prepare(`
      SELECT c.*, u.name as user_name, u.handle as user_handle, u.avatar as user_avatar
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.wish_id = ?
      ORDER BY c.created_at ASC
    `).all(req.params.id) as any[];

    res.json(comments.map(c => ({
      id: c.id,
      text: c.text,
      user_id: c.user_id,
      name: c.user_name,
      handle: c.user_handle,
      avatar: c.user_avatar,
      time: formatRelativeTime(c.created_at),
      created_at: c.created_at,
    })));
  } catch (error: any) {
    console.error("Error fetching comments:", error);
    res.status(500).json({ error: "Failed to fetch comments", details: error.message });
  }
});

// POST /api/wishes/:id/comments
wishesRouter.post("/:id/comments", (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    const wishId = req.params.id;

    if (!text || !text.trim()) {
      res.status(400).json({ error: "Comment text cannot be empty" });
      return;
    }

    const commentId = `c_${uuidv4().slice(0, 8)}`;
    db.prepare(`
      INSERT INTO comments (id, wish_id, user_id, text)
      VALUES (?, ?, ?, ?)
    `).run(commentId, wishId, CURRENT_USER_ID, text.trim());

    db.prepare(`UPDATE wishes SET comments_count = comments_count + 1 WHERE id = ?`).run(wishId);

    const wish = db.prepare("SELECT user_id, title FROM wishes WHERE id = ?").get(wishId) as any;
    const currentUser = db.prepare("SELECT name, avatar FROM users WHERE id = ?").get(CURRENT_USER_ID) as any;

    // Send notification if not commenting on own post
    if (wish && wish.user_id !== CURRENT_USER_ID) {
      db.prepare(`
        INSERT INTO notifications (id, user_id, actor_id, actor_name, actor_avatar, type, wish_id, wish_title, text)
        VALUES (?, ?, ?, ?, ?, 'comment', ?, ?, ?)
      `).run(
        `notif_${uuidv4().slice(0, 8)}`,
        wish.user_id,
        CURRENT_USER_ID,
        currentUser?.name || "Someone",
        currentUser?.avatar || "Y",
        wishId,
        wish.title,
        `commented: “${text.trim().slice(0, 50)}${text.trim().length > 50 ? "..." : ""}”`
      );
    }

    res.status(201).json({
      id: commentId,
      text: text.trim(),
      user_id: CURRENT_USER_ID,
      name: currentUser?.name || "You",
      handle: "you",
      avatar: currentUser?.avatar || "Y",
      time: "Just now",
      created_at: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error creating comment:", error);
    res.status(500).json({ error: "Failed to create comment", details: error.message });
  }
});

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 60) return "Just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d`;
    return `${Math.floor(diffDays / 7)}w`;
  } catch {
    return "recently";
  }
}
