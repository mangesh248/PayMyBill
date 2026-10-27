import { Router, Request, Response } from "express";
import { db } from "../db/database.js";

export const notificationsRouter = Router();

const CURRENT_USER_ID = "user_you";

// GET /api/notifications
notificationsRouter.get("/", (req: Request, res: Response) => {
  try {
    const rawList = db.prepare(`
      SELECT * FROM notifications 
      WHERE user_id = ? 
      ORDER BY created_at DESC
    `).all(CURRENT_USER_ID) as any[];

    const unreadCount = db.prepare(`
      SELECT COUNT(*) as count FROM notifications 
      WHERE user_id = ? AND is_read = 0
    `).get(CURRENT_USER_ID) as any;

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
notificationsRouter.post("/read-all", (req: Request, res: Response) => {
  try {
    db.prepare(`UPDATE notifications SET is_read = 1 WHERE user_id = ?`).run(CURRENT_USER_ID);
    res.json({ success: true, message: "All notifications marked as read" });
  } catch (error: any) {
    console.error("Error marking all read:", error);
    res.status(500).json({ error: "Failed to mark notifications read", details: error.message });
  }
});

// POST /api/notifications/:id/read
notificationsRouter.post("/:id/read", (req: Request, res: Response) => {
  try {
    db.prepare(`UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`).run(req.params.id, CURRENT_USER_ID);
    res.json({ success: true });
  } catch (error: any) {
    console.error("Error marking notification read:", error);
    res.status(500).json({ error: "Failed to mark notification read", details: error.message });
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
