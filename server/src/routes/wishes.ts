import { Router, Response } from "express";
import { db } from "../db/database.js";
import { v4 as uuidv4 } from "uuid";
import { type AuthRequest, getAuthenticatedUserId } from "../middleware/auth.js";
import { createWishSchema, commentSchema, reportWishSchema, validateBody } from "../validators/schemas.js";
import { formatRelativeTime } from "../utils/time.js";

export const wishesRouter = Router();

// GET /api/wishes/trending — Real trending categories and stats (F3 fix)
wishesRouter.get("/trending", (req: AuthRequest, res: Response) => {
  try {
    const categories = db
      .prepare(`
      SELECT 
        category,
        tag,
        COUNT(*) as count,
        SUM(raised) as total_raised,
        SUM(goal) as total_goal,
        ROUND((CAST(SUM(raised) AS FLOAT) / MAX(1, SUM(goal))) * 100) as avg_pct
      FROM wishes
      WHERE deleted_at IS NULL
      GROUP BY category
      ORDER BY count DESC, total_raised DESC
      LIMIT 6
    `)
      .all() as any[];

    const activeWishesCount = (
      db.prepare(`SELECT COUNT(*) as c FROM wishes WHERE deleted_at IS NULL AND status = 'active'`).get() as any
    )?.c || 0;

    res.json({
      trendingCategories: categories.map((c) => ({
        category: c.category,
        tag: c.tag,
        count: c.count,
        total_raised: c.total_raised,
        total_goal: c.total_goal,
        avg_pct: Math.min(100, c.avg_pct || 0),
      })),
      totalActiveWishes: activeWishesCount,
    });
  } catch (error: any) {
    console.error("Trending fetch error:", error);
    res.status(500).json({ error: "Failed to fetch trending emergencies", details: error.message });
  }
});

// GET /api/wishes (Supports pagination, search, category, dynamic friends, and sorting)
wishesRouter.get("/", (req: AuthRequest, res: Response) => {
  try {
    const currentUserId = getAuthenticatedUserId(req);
    const { category, tab, q, userId, sort, page, limit, format } = req.query;

    let whereClause = `WHERE (w.deleted_at IS NULL)`;
    const params: any[] = [currentUserId, currentUserId];

    if (userId) {
      whereClause += ` AND w.user_id = ?`;
      params.push(userId);
    }

    if (category && category !== "All") {
      whereClause += ` AND (w.category = ? OR w.tag = ?)`;
      params.push(category, category);
    }

    if (tab === "Friends") {
      whereClause += ` AND (w.user_id IN (SELECT following_id FROM follows WHERE follower_id = ?) OR w.is_friend = 1)`;
      params.push(currentUserId);
    }

    if (q) {
      const searchTerm = `%${String(q).trim()}%`;
      whereClause += ` AND (w.title LIKE ? OR w.body LIKE ? OR w.tag LIKE ? OR u.name LIKE ? OR u.handle LIKE ?)`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    // Server-side sorting (F7 fix)
    let orderBy = `ORDER BY w.created_at DESC`;
    if (sort === "urgent" || tab === "Urgent") {
      orderBy = `ORDER BY (CAST(w.raised AS FLOAT) / MAX(1, w.goal)) DESC, (w.goal - w.raised) ASC`;
    } else if (sort === "popular") {
      orderBy = `ORDER BY (w.likes_count * 2 + w.comments_count * 3) DESC`;
    } else if (sort === "oldest") {
      orderBy = `ORDER BY w.created_at ASC`;
    }

    // Count total matches for pagination (D5 fix)
    const countSql = `
      SELECT COUNT(*) as total
      FROM wishes w
      JOIN users u ON w.user_id = u.id
      ${whereClause}
    `;
    const countParams = params.slice(2); // without currentUserId likes/saves params
    const totalCount = (db.prepare(countSql).get(...countParams) as any)?.total || 0;

    // Build paginated query
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
      ${whereClause}
      ${orderBy}
    `;

    const pageNum = page ? Math.max(1, parseInt(String(page), 10)) : 1;
    const limitNum = limit ? Math.min(100, Math.max(1, parseInt(String(limit), 10))) : 20;
    const offset = (pageNum - 1) * limitNum;

    query += ` LIMIT ? OFFSET ?`;
    params.push(limitNum, offset);

    const rawRows = db.prepare(query).all(...params) as any[];

    // Fetch user reaction list for quick lookup
    const userReactions = db
      .prepare(`SELECT wish_id, emoji FROM reactions WHERE user_id = ?`)
      .all(currentUserId) as { wish_id: string; emoji: string }[];
    const reactionMap: Record<string, string[]> = {};
    for (const r of userReactions) {
      if (!reactionMap[r.wish_id]) reactionMap[r.wish_id] = [];
      reactionMap[r.wish_id].push(r.emoji);
    }

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
      provider_name: r.provider_name || null,
      bill_reference: r.bill_reference || null,
      verification_status: r.verification_status || (r.provider_name ? "verified" : "unverified"),
      liked: Boolean(r.liked),
      saved: Boolean(r.saved),
      userReactions: reactionMap[r.id] || [],
      time: formatRelativeTime(r.created_at),
      created_at: r.created_at,
    }));

    const totalPages = Math.ceil(totalCount / limitNum);
    const hasMore = offset + formatted.length < totalCount;

    res.set("X-Total-Count", String(totalCount));
    res.set("X-Page", String(pageNum));
    res.set("X-Total-Pages", String(totalPages));
    res.set("X-Has-More", String(hasMore));

    if (format === "paginated" || format === "object") {
      res.json({
        items: formatted,
        total: totalCount,
        page: pageNum,
        totalPages,
        hasMore,
      });
      return;
    }

    res.json(formatted);
  } catch (error: any) {
    console.error("Error fetching wishes:", error);
    res.status(500).json({ error: "Failed to fetch wishes", details: error.message });
  }
});

// GET /api/wishes/:id
wishesRouter.get("/:id", (req: AuthRequest, res: Response) => {
  try {
    const currentUserId = getAuthenticatedUserId(req);
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
      WHERE w.id = ? AND (w.deleted_at IS NULL)
    `).get(currentUserId, currentUserId, req.params.id) as any;

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

    // Get reactions
    const reactions = db.prepare(`
      SELECT emoji, COUNT(*) as count,
             EXISTS(SELECT 1 FROM reactions r2 WHERE r2.wish_id = reactions.wish_id AND r2.emoji = reactions.emoji AND r2.user_id = ?) as reacted
      FROM reactions
      WHERE wish_id = ?
      GROUP BY emoji
    `).all(currentUserId, req.params.id) as any[];

    res.json({
      ...wish,
      name: wish.user_name,
      handle: wish.user_handle,
      avatar: wish.user_avatar,
      liked: Boolean(wish.liked),
      saved: Boolean(wish.saved),
      time: formatRelativeTime(wish.created_at),
      comments: comments.map((c) => ({
        ...c,
        time: formatRelativeTime(c.created_at),
      })),
      sponsors,
      reactions,
    });
  } catch (error: any) {
    console.error("Error fetching single wish:", error);
    res.status(500).json({ error: "Failed to fetch wish", details: error.message });
  }
});

// POST /api/wishes
wishesRouter.post("/", (req: AuthRequest, res: Response) => {
  try {
    const data = validateBody(createWishSchema, req.body, res);
    if (!data) return;

    const currentUserId = getAuthenticatedUserId(req);
    const newId = `wish_${uuidv4().slice(0, 8)}`;
    const categoryName = data.category || "Everyday Wish";
    const tagName = data.tag ? data.tag.toUpperCase() : categoryName.toUpperCase();
    const defaultImg =
      data.img || "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&w=1000&q=80";

    const providerName = data.provider_name?.trim() || null;
    const billRef = data.bill_reference?.trim() || null;
    const verificationStatus = providerName ? "verified" : "unverified";

    db.prepare(`
      INSERT INTO wishes (
        id, user_id, title, body, tag, category, img, raised, goal, likes_count, comments_count, status, is_friend, provider_name, bill_reference, verification_status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, 0, 0, 'active', 1, ?, ?, ?)
    `).run(
      newId,
      currentUserId,
      data.title,
      data.body,
      tagName,
      categoryName,
      defaultImg,
      data.goal,
      providerName,
      billRef,
      verificationStatus
    );

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
      provider_name: created.provider_name || null,
      bill_reference: created.bill_reference || null,
      verification_status: created.verification_status || (created.provider_name ? "verified" : "unverified"),
      liked: false,
      saved: false,
      time: "Just now",
    });
  } catch (error: any) {
    console.error("Error creating wish:", error);
    res.status(500).json({ error: "Failed to create wish", details: error.message });
  }
});

// DELETE /api/wishes/:id (With ownership authorization check B5 & soft delete D7)
wishesRouter.delete("/:id", (req: AuthRequest, res: Response) => {
  try {
    const currentUserId = getAuthenticatedUserId(req);
    const wish = db.prepare("SELECT * FROM wishes WHERE id = ?").get(req.params.id) as any;

    if (!wish) {
      res.status(404).json({ error: "Wish not found" });
      return;
    }

    // Ownership check: Only owner or demo user in dev can delete
    if (wish.user_id !== currentUserId && currentUserId !== "user_you") {
      res.status(403).json({ error: "Forbidden: You can only delete your own wishes." });
      return;
    }

    // Soft delete
    db.prepare("UPDATE wishes SET deleted_at = datetime('now') WHERE id = ?").run(req.params.id);
    res.json({ success: true, message: "Wish deleted successfully." });
  } catch (error: any) {
    console.error("Error deleting wish:", error);
    res.status(500).json({ error: "Failed to delete wish", details: error.message });
  }
});

// POST /api/wishes/:id/report (P6 - Safety & Trust reporting)
wishesRouter.post("/:id/report", (req: AuthRequest, res: Response) => {
  try {
    const data = validateBody(reportWishSchema, req.body, res);
    if (!data) return;

    const currentUserId = getAuthenticatedUserId(req);
    const wishId = req.params.id;

    const wish = db.prepare("SELECT id, title FROM wishes WHERE id = ?").get(wishId) as any;
    if (!wish) {
      res.status(404).json({ error: "Wish not found" });
      return;
    }

    const reportId = `rep_${uuidv4().slice(0, 8)}`;
    db.prepare(`
      INSERT INTO reports (id, wish_id, reporter_id, reason, details, status, created_at)
      VALUES (?, ?, ?, ?, ?, 'pending', datetime('now'))
    `).run(reportId, wishId, currentUserId, data.reason, data.details || null);

    res.json({
      success: true,
      message: "Report submitted. Our safety & trust team will review this wish within 24 hours.",
    });
  } catch (error: any) {
    console.error("Report error:", error);
    res.status(500).json({ error: "Failed to submit report", details: error.message });
  }
});

// POST /api/wishes/:id/like
wishesRouter.post("/:id/like", (req: AuthRequest, res: Response) => {
  try {
    const currentUserId = getAuthenticatedUserId(req);
    const wishId = req.params.id;
    const existing = db
      .prepare("SELECT id FROM likes WHERE user_id = ? AND wish_id = ?")
      .get(currentUserId, wishId) as any;

    let liked = false;
    if (existing) {
      db.prepare("DELETE FROM likes WHERE id = ?").run(existing.id);
      db.prepare("UPDATE wishes SET likes_count = MAX(0, likes_count - 1) WHERE id = ?").run(wishId);
      liked = false;
    } else {
      db.prepare("INSERT INTO likes (id, user_id, wish_id) VALUES (?, ?, ?)").run(
        `like_${uuidv4().slice(0, 8)}`,
        currentUserId,
        wishId
      );
      db.prepare("UPDATE wishes SET likes_count = likes_count + 1 WHERE id = ?").run(wishId);
      liked = true;

      // Add notification to wish owner if not own wish
      const wish = db.prepare("SELECT user_id, title FROM wishes WHERE id = ?").get(wishId) as any;
      if (wish && wish.user_id !== currentUserId) {
        const currentUser = db.prepare("SELECT name, avatar FROM users WHERE id = ?").get(currentUserId) as any;
        db.prepare(`
          INSERT INTO notifications (id, user_id, actor_id, actor_name, actor_avatar, type, wish_id, wish_title, text)
          VALUES (?, ?, ?, ?, ?, 'like', ?, ?, ?)
        `).run(
          `notif_${uuidv4().slice(0, 8)}`,
          wish.user_id,
          currentUserId,
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
wishesRouter.post("/:id/save", (req: AuthRequest, res: Response) => {
  try {
    const currentUserId = getAuthenticatedUserId(req);
    const wishId = req.params.id;
    const existing = db
      .prepare("SELECT id FROM saves WHERE user_id = ? AND wish_id = ?")
      .get(currentUserId, wishId) as any;

    let saved = false;
    if (existing) {
      db.prepare("DELETE FROM saves WHERE id = ?").run(existing.id);
      saved = false;
    } else {
      db.prepare("INSERT INTO saves (id, user_id, wish_id) VALUES (?, ?, ?)").run(
        `save_${uuidv4().slice(0, 8)}`,
        currentUserId,
        wishId
      );
      saved = true;
    }

    res.json({ saved });
  } catch (error: any) {
    console.error("Error toggling save:", error);
    res.status(500).json({ error: "Failed to toggle save", details: error.message });
  }
});

// POST /api/wishes/:id/react (Emoji reaction support - F1 fix)
wishesRouter.post("/:id/react", (req: AuthRequest, res: Response) => {
  try {
    const currentUserId = getAuthenticatedUserId(req);
    const wishId = req.params.id;
    const { emoji } = req.body;

    if (!emoji || typeof emoji !== "string") {
      res.status(400).json({ error: "Valid emoji is required" });
      return;
    }

    const existing = db
      .prepare("SELECT id FROM reactions WHERE user_id = ? AND wish_id = ? AND emoji = ?")
      .get(currentUserId, wishId, emoji) as any;

    let reacted = false;
    if (existing) {
      db.prepare("DELETE FROM reactions WHERE id = ?").run(existing.id);
      reacted = false;
    } else {
      db.prepare("INSERT INTO reactions (id, wish_id, user_id, emoji) VALUES (?, ?, ?, ?)").run(
        `react_${uuidv4().slice(0, 8)}`,
        wishId,
        currentUserId,
        emoji
      );
      reacted = true;
    }

    res.json({ success: true, emoji, reacted });
  } catch (error: any) {
    console.error("Error toggling reaction:", error);
    res.status(500).json({ error: "Failed to toggle reaction", details: error.message });
  }
});

// GET /api/wishes/:id/comments
wishesRouter.get("/:id/comments", (req: AuthRequest, res: Response) => {
  try {
    const comments = db.prepare(`
      SELECT c.*, u.name as user_name, u.handle as user_handle, u.avatar as user_avatar
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.wish_id = ?
      ORDER BY c.created_at ASC
    `).all(req.params.id) as any[];

    res.json(
      comments.map((c) => ({
        id: c.id,
        text: c.text,
        user_id: c.user_id,
        name: c.user_name,
        handle: c.user_handle,
        avatar: c.user_avatar,
        time: formatRelativeTime(c.created_at),
        created_at: c.created_at,
      }))
    );
  } catch (error: any) {
    console.error("Error fetching comments:", error);
    res.status(500).json({ error: "Failed to fetch comments", details: error.message });
  }
});

// POST /api/wishes/:id/comments
wishesRouter.post("/:id/comments", (req: AuthRequest, res: Response) => {
  try {
    const data = validateBody(commentSchema, req.body, res);
    if (!data) return;

    const currentUserId = getAuthenticatedUserId(req);
    const wishId = req.params.id;

    const commentId = `c_${uuidv4().slice(0, 8)}`;
    db.prepare(`
      INSERT INTO comments (id, wish_id, user_id, text)
      VALUES (?, ?, ?, ?)
    `).run(commentId, wishId, currentUserId, data.text);

    db.prepare(`UPDATE wishes SET comments_count = comments_count + 1 WHERE id = ?`).run(wishId);

    const wish = db.prepare("SELECT user_id, title FROM wishes WHERE id = ?").get(wishId) as any;
    const currentUser = db.prepare("SELECT name, avatar FROM users WHERE id = ?").get(currentUserId) as any;

    // Send notification if not commenting on own post
    if (wish && wish.user_id !== currentUserId) {
      db.prepare(`
        INSERT INTO notifications (id, user_id, actor_id, actor_name, actor_avatar, type, wish_id, wish_title, text)
        VALUES (?, ?, ?, ?, ?, 'comment', ?, ?, ?)
      `).run(
        `notif_${uuidv4().slice(0, 8)}`,
        wish.user_id,
        currentUserId,
        currentUser?.name || "Someone",
        currentUser?.avatar || "Y",
        wishId,
        wish.title,
        `commented: “${data.text.slice(0, 50)}${data.text.length > 50 ? "..." : ""}”`
      );
    }

    res.status(201).json({
      id: commentId,
      text: data.text,
      user_id: currentUserId,
      name: currentUser?.name || "You",
      handle: currentUser?.handle || "you",
      avatar: currentUser?.avatar || "Y",
      time: "Just now",
      created_at: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error creating comment:", error);
    res.status(500).json({ error: "Failed to create comment", details: error.message });
  }
});
