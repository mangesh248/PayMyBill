import { Router, Response } from "express";
import { db } from "../db/database.js";
import { type AuthRequest, getAuthenticatedUserId } from "../middleware/auth.js";
import { formatRelativeTime } from "../utils/time.js";

export const notificationsRouter = Router();

// GET /api/notifications
notificationsRouter.get("/", (req: AuthRequest, res: Response) => {
  try {
    const currentUserId = getAuthenticatedUserId(req);

    const rawList = db
      .prepare(`
      SELECT * FROM notifications 
      WHERE user_id = ? 
      ORDER BY created_at DESC
    `)
      .all(currentUserId) as any[];

    const unreadCount = db
      .prepare(`
      SELECT COUNT(*) as count FROM notifications 
      WHERE user_id = ? AND is_read = 0
    `)
      .get(currentUserId) as any;

    const formatted = rawList.map((n) => ({
      id: n.id,
      who: n.actor_name,
      avatar: n.actor_avatar || n.actor_name[0],
      text: n.text,
      type: n.type,
      wish_id: n.wish_id,
      wish_title: n.wish_title,
      amount: n.amount,
      is_read: Boolean(n.is_read),
      time: formatRelativeTime(n.created_at),
      created_at: n.created_at,
    }));

    res.json({
      notifications: formatted,
      unreadCount: unreadCount?.count ?? 0,
    });
  } catch (error: any) {
    console.error("Notifications error:", error);
    res.status(500).json({ error: "Failed to fetch notifications", details: error.message });
  }
});

// POST /api/notifications/read-all
notificationsRouter.post("/read-all", (req: AuthRequest, res: Response) => {
  try {
    const currentUserId = getAuthenticatedUserId(req);
    db.prepare(`UPDATE notifications SET is_read = 1 WHERE user_id = ?`).run(currentUserId);
    res.json({ success: true, message: "All notifications marked as read" });
  } catch (error: any) {
    console.error("Error marking all read:", error);
    res.status(500).json({ error: "Failed to mark notifications read", details: error.message });
  }
});

// POST /api/notifications/:id/read
notificationsRouter.post("/:id/read", (req: AuthRequest, res: Response) => {
  try {
    const currentUserId = getAuthenticatedUserId(req);
    db.prepare(`UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`).run(
      req.params.id,
      currentUserId
    );
    res.json({ success: true });
  } catch (error: any) {
    console.error("Error marking notification read:", error);
    res.status(500).json({ error: "Failed to mark notification read", details: error.message });
  }
});
