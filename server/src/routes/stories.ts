import { Router, Response } from "express";
import { db } from "../db/database.js";
import { v4 as uuidv4 } from "uuid";
import { type AuthRequest, getAuthenticatedUserId } from "../middleware/auth.js";
import { createStorySchema, validateBody } from "../validators/schemas.js";

export const storiesRouter = Router();

// GET /api/stories
storiesRouter.get("/", (req: AuthRequest, res: Response) => {
  try {
    const stories = db
      .prepare(`
      SELECT s.*, u.name as user_name, u.handle as user_handle
      FROM stories s
      JOIN users u ON s.user_id = u.id
      ORDER BY s.created_at DESC
    `)
      .all() as any[];

    res.json(
      stories.map((s) => ({
        id: s.id,
        title: s.title,
        name: s.avatar_name,
        user_id: s.user_id,
        handle: s.user_handle,
      }))
    );
  } catch (error: any) {
    console.error("Stories error:", error);
    res.status(500).json({ error: "Failed to fetch stories", details: error.message });
  }
});

// POST /api/stories
storiesRouter.post("/", (req: AuthRequest, res: Response) => {
  try {
    const data = validateBody(createStorySchema, req.body, res);
    if (!data) return;

    const currentUserId = getAuthenticatedUserId(req);
    const user = db.prepare(`SELECT name, handle FROM users WHERE id = ?`).get(currentUserId) as any;

    const storyId = `story_${uuidv4().slice(0, 8)}`;
    db.prepare(`
      INSERT INTO stories (id, user_id, title, avatar_name)
      VALUES (?, ?, ?, ?)
    `).run(storyId, currentUserId, data.title, user?.name || data.title);

    res.status(201).json({
      id: storyId,
      title: data.title,
      name: user?.name || data.title,
      user_id: currentUserId,
      handle: user?.handle || "you",
    });
  } catch (error: any) {
    console.error("Story creation error:", error);
    res.status(500).json({ error: "Failed to create story", details: error.message });
  }
});
