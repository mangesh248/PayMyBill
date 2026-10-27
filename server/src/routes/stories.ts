import { Router, Request, Response } from "express";
import { db } from "../db/database.js";
import { v4 as uuidv4 } from "uuid";

export const storiesRouter = Router();

// GET /api/stories
storiesRouter.get("/", (req: Request, res: Response) => {
  try {
    const stories = db.prepare(`
      SELECT s.*, u.name as user_name, u.handle as user_handle
      FROM stories s
      JOIN users u ON s.user_id = u.id
      ORDER BY s.created_at DESC
    `).all() as any[];

    res.json(stories.map(s => ({
      id: s.id,
      title: s.title,
      name: s.avatar_name,
      user_id: s.user_id,
      handle: s.user_handle,
    })));
  } catch (error: any) {
    console.error("Stories error:", error);
    res.status(500).json({ error: "Failed to fetch stories", details: error.message });
  }
});

// POST /api/stories
storiesRouter.post("/", (req: Request, res: Response) => {
  try {
    const { title } = req.body;
    if (!title || !title.trim()) {
      res.status(400).json({ error: "Story title is required" });
      return;
    }

    const storyId = `story_${uuidv4().slice(0, 8)}`;
    db.prepare(`
      INSERT INTO stories (id, user_id, title, avatar_name)
      VALUES (?, 'user_you', ?, ?)
    `).run(storyId, title.trim(), title.trim());

    res.status(201).json({
      id: storyId,
      title: title.trim(),
      name: title.trim(),
      user_id: "user_you",
      handle: "you",
    });
  } catch (error: any) {
    console.error("Story creation error:", error);
    res.status(500).json({ error: "Failed to create story", details: error.message });
  }
});
