import { Router, Request, Response } from "express";
import { db } from "../db/database.js";

export const usersRouter = Router();

const CURRENT_USER_ID = "user_you";

// GET /api/me (Current user full profile & tabbed wishes)
usersRouter.get("/me", (req: Request, res: Response) => {
  try {
    const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(CURRENT_USER_ID) as any;
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Created wishes
    const myWishes = db.prepare(`
      SELECT 
        w.*,
        u.name as user_name,
        u.handle as user_handle,
        u.avatar as user_avatar,
        EXISTS(SELECT 1 FROM likes l WHERE l.wish_id = w.id AND l.user_id = ?) as liked,
        EXISTS(SELECT 1 FROM saves s WHERE s.wish_id = w.id AND s.user_id = ?) as saved
      FROM wishes w
      JOIN users u ON w.user_id = u.id
      WHERE w.user_id = ?
      ORDER BY w.created_at DESC
    `).all(CURRENT_USER_ID, CURRENT_USER_ID, CURRENT_USER_ID) as any[];

    // Sponsored wishes (wishes where user has completed transactions)
    const sponsoredWishes = db.prepare(`
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
      WHERE t.sponsor_id = ? AND t.status = 'completed'
      ORDER BY w.created_at DESC
    `).all(CURRENT_USER_ID, CURRENT_USER_ID, CURRENT_USER_ID) as any[];

    // Saved wishes
    const savedWishes = db.prepare(`
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
      WHERE s.user_id = ?
      ORDER BY s.created_at DESC
    `).all(CURRENT_USER_ID, CURRENT_USER_ID) as any[];

    const format = (list: any[]) => list.map(r => ({
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
      time: "Recently",
      created_at: r.created_at,
    }));

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
      },
      stats: {
        wishes_count: myWishes.length,
        total_paid: user.total_paid,
        bills_sponsored: user.bills_sponsored,
        followers: user.followers_count,
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
usersRouter.get("/:id", (req: Request, res: Response) => {
  try {
    const user = db.prepare(`SELECT id, name, handle, avatar, bio, total_paid, bills_sponsored, followers_count FROM users WHERE id = ? OR handle = ?`).get(req.params.id, req.params.id) as any;
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const wishes = db.prepare(`
      SELECT 
        w.*,
        u.name as user_name,
        u.handle as user_handle,
        u.avatar as user_avatar
      FROM wishes w
      JOIN users u ON w.user_id = u.id
      WHERE w.user_id = ?
      ORDER BY w.created_at DESC
    `).all(user.id) as any[];

    res.json({
      user,
      wishes: wishes.map(r => ({
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
