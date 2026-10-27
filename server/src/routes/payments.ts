import { Router, Request, Response } from "express";
import { db } from "../db/database.js";
import { v4 as uuidv4 } from "uuid";

export const paymentsRouter = Router();

const CURRENT_USER_ID = "user_you";

// POST /api/payments
paymentsRouter.post("/", (req: Request, res: Response) => {
  try {
    const {
      wish_id,
      amount,
      payment_method = "upi",
      message = "",
      is_anonymous = false,
      idempotency_key,
    } = req.body;

    if (!wish_id) {
      res.status(400).json({ error: "Wish ID is required" });
      return;
    }

    const payAmount = parseInt(amount, 10);
    if (isNaN(payAmount) || payAmount <= 0) {
      res.status(400).json({ error: "Amount must be a positive integer" });
      return;
    }

    // Check idempotency if provided
    if (idempotency_key) {
      const existingTxn = db.prepare(`SELECT * FROM transactions WHERE idempotency_key = ?`).get(idempotency_key) as any;
      if (existingTxn) {
        res.json({
          success: true,
          idempotent: true,
          transaction: existingTxn,
          message: "Transaction already processed",
        });
        return;
      }
    }

    // Get wish and sponsor
    const wish = db.prepare(`SELECT * FROM wishes WHERE id = ?`).get(wish_id) as any;
    if (!wish) {
      res.status(404).json({ error: "Wish not found" });
      return;
    }

    const sponsor = db.prepare(`SELECT * FROM users WHERE id = ?`).get(CURRENT_USER_ID) as any;
    const sponsorName = is_anonymous ? "Kind Sponsor" : (sponsor?.name || "Kind Sponsor");
    const sponsorHandle = is_anonymous ? "anonymous" : (sponsor?.handle || "you");
    const txnId = `TXN_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const paymentRef = `${payment_method.toUpperCase()}/${sponsorHandle.toUpperCase()}/${Math.floor(100000 + Math.random() * 900000)}`;

    const nowIso = new Date().toISOString();

    // Perform atomic transaction
    const executePayment = db.transaction(() => {
      // 1. Insert transaction
      db.prepare(`
        INSERT INTO transactions (
          id, wish_id, sponsor_id, sponsor_name, sponsor_handle,
          amount, payment_method, payment_reference, message,
          is_anonymous, status, idempotency_key, created_at
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, 'completed', ?, ?
        )
      `).run(
        txnId,
        wish_id,
        CURRENT_USER_ID,
        sponsorName,
        sponsorHandle,
        payAmount,
        payment_method,
        paymentRef,
        message ? message.trim() : null,
        is_anonymous ? 1 : 0,
        idempotency_key || txnId,
        nowIso
      );

      // 2. Update wish raised and status
      const newRaised = wish.raised + payAmount;
      const newStatus = newRaised >= wish.goal ? "funded" : "active";
      db.prepare(`UPDATE wishes SET raised = ?, status = ? WHERE id = ?`).run(newRaised, newStatus, wish_id);

      // 3. Update sponsor user totals
      db.prepare(`
        UPDATE users 
        SET total_paid = total_paid + ?, bills_sponsored = bills_sponsored + 1
        WHERE id = ?
      `).run(payAmount, CURRENT_USER_ID);

      // 4. Send notification to wish recipient
      const notifId = `notif_${uuidv4().slice(0, 8)}`;
      db.prepare(`
        INSERT INTO notifications (
          id, user_id, actor_id, actor_name, actor_avatar,
          type, wish_id, wish_title, amount, text, created_at
        ) VALUES (
          ?, ?, ?, ?, ?,
          'contribution', ?, ?, ?, ?, ?
        )
      `).run(
        notifId,
        wish.user_id,
        CURRENT_USER_ID,
        sponsorName,
        sponsor?.avatar || "Y",
        wish.id,
        wish.title,
        payAmount,
        `chipped in ₹${payAmount.toLocaleString("en-IN")} to your wish “${wish.title}”`,
        nowIso
      );

      // 5. If personal message attached, also add to direct messages
      if (message && message.trim() && wish.user_id !== CURRENT_USER_ID) {
        db.prepare(`
          INSERT INTO messages (id, sender_id, recipient_id, text, created_at)
          VALUES (?, ?, ?, ?, ?)
        `).run(
          `m_${uuidv4().slice(0, 8)}`,
          CURRENT_USER_ID,
          wish.user_id,
          `Paid ₹${payAmount.toLocaleString("en-IN")} towards your bill: ${message.trim()}`,
          nowIso
        );
      }

      return { newRaised, newStatus };
    });

    const { newRaised, newStatus } = executePayment();

    res.status(201).json({
      success: true,
      message: `Successfully contributed ₹${payAmount.toLocaleString("en-IN")} to ${wish.title}!`,
      transaction: {
        id: txnId,
        wish_id,
        wish_title: wish.title,
        amount: payAmount,
        payment_method,
        payment_reference: paymentRef,
        message: message?.trim() || null,
        is_anonymous,
        timestamp: new Date().toISOString(),
        fees: {
          platform_fee: 0,
          gateway_fee: 0,
          net_to_recipient: payAmount,
        },
      },
      updatedWish: {
        id: wish.id,
        raised: newRaised,
        goal: wish.goal,
        status: newStatus,
        pct: Math.min(100, Math.round((newRaised / wish.goal) * 100)),
      },
    });
  } catch (error: any) {
    console.error("Payment execution error:", error);
    res.status(500).json({ error: "Failed to process payment", details: error.message });
  }
});

// GET /api/payments/history
paymentsRouter.get("/history", (req: Request, res: Response) => {
  try {
    const history = db.prepare(`
      SELECT 
        t.*,
        w.title as wish_title,
        w.img as wish_img,
        w.tag as wish_tag,
        u.name as recipient_name,
        u.handle as recipient_handle
      FROM transactions t
      JOIN wishes w ON t.wish_id = w.id
      JOIN users u ON w.user_id = u.id
      WHERE t.sponsor_id = ?
      ORDER BY t.created_at DESC
    `).all(CURRENT_USER_ID) as any[];

    res.json(history);
  } catch (error: any) {
    console.error("Payment history error:", error);
    res.status(500).json({ error: "Failed to fetch payment history", details: error.message });
  }
});

// GET /api/payments/receipt/:id
paymentsRouter.get("/receipt/:id", (req: Request, res: Response) => {
  try {
    const txn = db.prepare(`
      SELECT 
        t.*,
        w.title as wish_title,
        w.raised as wish_raised,
        w.goal as wish_goal,
        w.tag as wish_tag,
        u.name as recipient_name,
        u.handle as recipient_handle
      FROM transactions t
      JOIN wishes w ON t.wish_id = w.id
      JOIN users u ON w.user_id = u.id
      WHERE t.id = ?
    `).get(req.params.id) as any;

    if (!txn) {
      res.status(404).json({ error: "Transaction receipt not found" });
      return;
    }

    res.json(txn);
  } catch (error: any) {
    console.error("Receipt error:", error);
    res.status(500).json({ error: "Failed to fetch receipt", details: error.message });
  }
});
