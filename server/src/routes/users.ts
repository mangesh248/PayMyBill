import { Router, Response } from "express";
import { db } from "../db/database.js";
import { type AuthRequest, getAuthenticatedUserId } from "../middleware/auth.js";
import { formatRelativeTime } from "../utils/time.js";

export const usersRouter = Router();

function calculateStreakDays(userId: string): number {
  try {
    const dates = db
      .prepare(`
      SELECT DISTINCT date(created_at) as tx_date 
      FROM transactions 
      WHERE sponsor_id = ? 
      ORDER BY tx_date DESC
    `)
      .all(userId) as { tx_date: string }[];

    if (!dates || dates.length === 0) return 0;

    let streak = 0;
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    const firstDate = dates[0].tx_date;
    if (firstDate !== todayStr && firstDate !== yesterdayStr) {
      return 0;
    }

    let curDate = new Date(firstDate);
    for (const d of dates) {
      const matchStr = curDate.toISOString().slice(0, 10);
      if (d.tx_date === matchStr) {
        streak++;
        curDate.setDate(curDate.getDate() - 1);
      } else {
        break;
      }
    }
    return Math.max(streak, 1);
  } catch {
    return 1;
  }
}

// GET /api/users/me (Current user full profile & tabbed wishes)
usersRouter.get("/me", (req: AuthRequest, res: Response) => {
  try {
    const currentUserId = getAuthenticatedUserId(req);
    const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(currentUserId) as any;
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Created wishes
    const myWishes = db
      .prepare(`
      SELECT 
        w.*,
        u.name as user_name,
        u.handle as user_handle,
        u.avatar as user_avatar,
        EXISTS(SELECT 1 FROM likes l WHERE l.wish_id = w.id AND l.user_id = ?) as liked,
        EXISTS(SELECT 1 FROM saves s WHERE s.wish_id = w.id AND s.user_id = ?) as saved
      FROM wishes w
      JOIN users u ON w.user_id = u.id
      WHERE w.user_id = ? AND (w.deleted_at IS NULL)
      ORDER BY w.created_at DESC
    `)
      .all(currentUserId, currentUserId, currentUserId) as any[];

    // Sponsored wishes (wishes where user has completed transactions)
    const sponsoredWishes = db
      .prepare(`
      SELECT DISTINCT
        w.*,
        u.name as user_name,
        u.handle as user_handle,
        u.avatar as user_avatar,
        EXISTS(SELECT 1 FROM likes l WHERE l.wish_id = w.id AND l.user_id = ?) as liked,
        EXISTS(SELECT 1 FROM saves s WHERE s.wish_id = w.id AND s.user_id = ?) as saved
      FROM wishes w
      JOIN users u ON w.user_id = u.id
      JOIN transactions t ON t.wish_id = w.id
      WHERE t.sponsor_id = ? AND t.status = 'completed' AND (w.deleted_at IS NULL)
      ORDER BY w.created_at DESC
    `)
      .all(currentUserId, currentUserId, currentUserId) as any[];

    // Saved wishes
    const savedWishes = db
      .prepare(`
      SELECT 
        w.*,
        u.name as user_name,
        u.handle as user_handle,
        u.avatar as user_avatar,
        EXISTS(SELECT 1 FROM likes l WHERE l.wish_id = w.id AND l.user_id = ?) as liked,
        1 as saved
      FROM wishes w
      JOIN users u ON w.user_id = u.id
      JOIN saves s ON s.wish_id = w.id
      WHERE s.user_id = ? AND (w.deleted_at IS NULL)
      ORDER BY s.created_at DESC
    `)
      .all(currentUserId, currentUserId) as any[];

    const format = (list: any[]) =>
      list.map((r) => ({
        id: r.id,
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

    const streak = calculateStreakDays(currentUserId);

    res.json({
      user: {
        id: user.id,
        name: user.name,
        handle: user.handle,
        avatar: user.avatar,
        bio: user.bio,
        total_paid: user.total_paid,
        bills_sponsored: user.bills_sponsored,
        followers_count: user.followers_count,
        streak_days: streak,
      },
      stats: {
        wishes_count: myWishes.length,
        total_paid: user.total_paid,
        bills_sponsored: user.bills_sponsored,
        followers: user.followers_count,
        streak_days: streak,
      },
      myWishes: format(myWishes),
      sponsoredWishes: format(sponsoredWishes),
      savedWishes: format(savedWishes),
    });
  } catch (error: any) {
    console.error("Profile fetch error:", error);
    res.status(500).json({ error: "Failed to fetch profile", details: error.message });
  }
});

// GET /api/users/:id
usersRouter.get("/:id", (req: AuthRequest, res: Response) => {
  try {
    const user = db
      .prepare(
        `SELECT id, name, handle, avatar, bio, total_paid, bills_sponsored, followers_count FROM users WHERE id = ? OR handle = ?`
      )
      .get(req.params.id, req.params.id) as any;
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const wishes = db
      .prepare(`
      SELECT 
        w.*,
        u.name as user_name,
        u.handle as user_handle,
        u.avatar as user_avatar
      FROM wishes w
      JOIN users u ON w.user_id = u.id
      WHERE w.user_id = ? AND (w.deleted_at IS NULL)
      ORDER BY w.created_at DESC
    `).all(user.id) as any[];

    res.json({
      user,
      wishes: wishes.map((r) => ({
        id: r.id,
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
      })),
    });
  } catch (error: any) {
    console.error("User fetch error:", error);
    res.status(500).json({ error: "Failed to fetch user", details: error.message });
  }
});

// GET /api/users/:id/follow-status
usersRouter.get("/:id/follow-status", (req: AuthRequest, res: Response) => {
  try {
    const currentUserId = getAuthenticatedUserId(req);
    const targetId = req.params.id;

    const row = db
      .prepare(`SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?`)
      .get(currentUserId, targetId);

    res.json({ isFollowing: Boolean(row) });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to get follow status", details: error.message });
  }
});

// POST /api/users/:id/follow
usersRouter.post("/:id/follow", (req: AuthRequest, res: Response) => {
  try {
    const currentUserId = getAuthenticatedUserId(req);
    const targetId = req.params.id;

    if (currentUserId === targetId) {
      res.status(400).json({ error: "You cannot follow yourself" });
      return;
    }

    const targetUser = db.prepare(`SELECT id, name FROM users WHERE id = ?`).get(targetId) as any;
    if (!targetUser) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const currentUser = db.prepare(`SELECT id, name FROM users WHERE id = ?`).get(currentUserId) as any;

    const existing = db
      .prepare(`SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?`)
      .get(currentUserId, targetId);

    let following = false;
    const tx = db.transaction(() => {
      if (existing) {
        // Unfollow
        db.prepare(`DELETE FROM follows WHERE follower_id = ? AND following_id = ?`).run(
          currentUserId,
          targetId
        );
        db.prepare(
          `UPDATE users SET followers_count = MAX(0, followers_count - 1) WHERE id = ?`
        ).run(targetId);
        following = false;
      } else {
        // Follow
        db.prepare(`INSERT INTO follows (follower_id, following_id) VALUES (?, ?)`).run(
          currentUserId,
          targetId
        );
        db.prepare(`UPDATE users SET followers_count = followers_count + 1 WHERE id = ?`).run(
          targetId
        );
        // Create notification
        db.prepare(`
          INSERT INTO notifications (id, user_id, actor_id, actor_name, actor_avatar, type, text, is_read, created_at)
          VALUES (?, ?, ?, ?, ?, 'follow', ?, 0, datetime('now'))
        `).run(
          `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          targetId,
          currentUserId,
          currentUser?.name || "Someone",
          currentUser?.avatar || null,
          `${currentUser?.name || "Someone"} started following you!`
        );
        following = true;
      }
    });

    tx();

    const updated = db.prepare(`SELECT followers_count FROM users WHERE id = ?`).get(targetId) as any;

    res.json({
      success: true,
      following,
      followersCount: updated?.followers_count ?? 0,
      message: following ? `Following ${targetUser.name}` : `Unfollowed ${targetUser.name}`,
    });
  } catch (error: any) {
    console.error("Follow error:", error);
    res.status(500).json({ error: "Failed to toggle follow", details: error.message });
  }
});
