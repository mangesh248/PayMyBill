import { Router, Response } from "express";
import { db } from "../db/database.js";
import { v4 as uuidv4 } from "uuid";
import { type AuthRequest, getAuthenticatedUserId } from "../middleware/auth.js";
import { sendMessageSchema, validateBody } from "../validators/schemas.js";
import { formatRelativeTime } from "../utils/time.js";

export const messagesRouter = Router();

// GET /api/messages (List of chats/conversations)
messagesRouter.get("/", (req: AuthRequest, res: Response) => {
  try {
    const currentUserId = getAuthenticatedUserId(req);

    // Get all users with whom current user has exchanged messages
    const rows = db
      .prepare(`
      SELECT 
        m.id,
        m.text,
        m.created_at,
        CASE 
          WHEN m.sender_id = ? THEN m.recipient_id 
          ELSE m.sender_id 
        END as partner_id
      FROM messages m
      WHERE m.sender_id = ? OR m.recipient_id = ?
      ORDER BY m.created_at DESC
    `)
      .all(currentUserId, currentUserId, currentUserId) as any[];

    // Group by partner_id keeping latest message
    const seenPartners = new Set<string>();
    const conversations: any[] = [];

    for (const row of rows) {
      if (!seenPartners.has(row.partner_id)) {
        seenPartners.add(row.partner_id);

        const partner = db
          .prepare(`SELECT id, name, handle, avatar FROM users WHERE id = ?`)
          .get(row.partner_id) as any;
        if (partner) {
          conversations.push({
            id: partner.id,
            name: partner.name,
            handle: partner.handle,
            avatar: partner.avatar || partner.name[0],
            last: row.text,
            time: formatRelativeTime(row.created_at),
            created_at: row.created_at,
          });
        }
      }
    }

    res.json(conversations);
  } catch (error: any) {
    console.error("Messages list error:", error);
    res.status(500).json({ error: "Failed to fetch messages", details: error.message });
  }
});

// GET /api/messages/thread/:partnerId
messagesRouter.get("/thread/:partnerId", (req: AuthRequest, res: Response) => {
  try {
    const currentUserId = getAuthenticatedUserId(req);
    const { partnerId } = req.params;

    // Check if partnerId is a user id or user name/handle
    const partner = db
      .prepare(`SELECT * FROM users WHERE id = ? OR name = ? OR handle = ?`)
      .get(partnerId, partnerId, partnerId) as any;
    if (!partner) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const messages = db
      .prepare(`
      SELECT m.*, 
             u.name as sender_name, 
             u.handle as sender_handle,
             u.avatar as sender_avatar
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE (m.sender_id = ? AND m.recipient_id = ?)
         OR (m.sender_id = ? AND m.recipient_id = ?)
      ORDER BY m.created_at ASC
    `)
      .all(currentUserId, partner.id, partner.id, currentUserId) as any[];

    res.json({
      partner: {
        id: partner.id,
        name: partner.name,
        handle: partner.handle,
        avatar: partner.avatar,
      },
      messages: messages.map((m) => ({
        id: m.id,
        sender_id: m.sender_id,
        is_me: m.sender_id === currentUserId,
        text: m.text,
        time: formatRelativeTime(m.created_at),
        created_at: m.created_at,
      })),
    });
  } catch (error: any) {
    console.error("Message thread error:", error);
    res.status(500).json({ error: "Failed to fetch message thread", details: error.message });
  }
});

// POST /api/messages
messagesRouter.post("/", (req: AuthRequest, res: Response) => {
  try {
    const data = validateBody(sendMessageSchema, req.body, res);
    if (!data) return;

    const currentUserId = getAuthenticatedUserId(req);

    let targetId = data.recipient_id;
    if (!targetId && data.recipient_name) {
      const u = db
        .prepare("SELECT id FROM users WHERE name = ? OR handle = ?")
        .get(data.recipient_name, data.recipient_name) as any;
      targetId = u?.id;
    }

    if (!targetId) {
      res.status(400).json({ error: "Valid recipient is required" });
      return;
    }

    const messageId = `m_${uuidv4().slice(0, 8)}`;
    db.prepare(`
      INSERT INTO messages (id, sender_id, recipient_id, text)
      VALUES (?, ?, ?, ?)
    `).run(messageId, currentUserId, targetId, data.text);

    res.status(201).json({
      id: messageId,
      sender_id: currentUserId,
      recipient_id: targetId,
      text: data.text,
      is_me: true,
      time: "Just now",
      created_at: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Send message error:", error);
    res.status(500).json({ error: "Failed to send message", details: error.message });
  }
});
