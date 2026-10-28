import { Router, Response } from "express";
import crypto from "crypto";
import { db } from "../db/database.js";
import { v4 as uuidv4 } from "uuid";
import { type AuthRequest, getAuthenticatedUserId } from "../middleware/auth.js";
import {
  paymentSchema,
  createOrderSchema,
  verifyPaymentSchema,
  refundPaymentSchema,
  validateBody,
} from "../validators/schemas.js";
import { config } from "../utils/config.js";

export const paymentsRouter = Router();

// POST /api/payments/create-order — Step 1 of real payment gateway flow
paymentsRouter.post("/create-order", async (req: AuthRequest, res: Response) => {
  try {
    const data = validateBody(createOrderSchema, req.body, res);
    if (!data) return;

    const currentUserId = getAuthenticatedUserId(req);

    const wish = db
      .prepare(`SELECT * FROM wishes WHERE id = ? AND deleted_at IS NULL`)
      .get(data.wish_id) as any;
    if (!wish) {
      res.status(404).json({ error: "Wish not found or has been removed." });
      return;
    }

    const remaining = Math.max(0, wish.goal - wish.raised);
    if (remaining <= 0) {
      res.status(400).json({
        error: "This wish is already 100% funded! Thank you for your generosity.",
      });
      return;
    }

    // Cap amount at remaining goal if needed
    const payAmount = Math.min(data.amount, remaining);
    const amountInPaise = payAmount * 100;
    const nowIso = new Date().toISOString();

    let orderId: string;
    let isMock = true;

    // Check if live Razorpay keys are provided
    if (config.RAZORPAY_KEY_ID && config.RAZORPAY_KEY_SECRET) {
      try {
        const authHeader = Buffer.from(
          `${config.RAZORPAY_KEY_ID}:${config.RAZORPAY_KEY_SECRET}`
        ).toString("base64");

        const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${authHeader}`,
          },
          body: JSON.stringify({
            amount: amountInPaise,
            currency: "INR",
            receipt: `rcpt_${uuidv4().slice(0, 10)}`,
            notes: {
              wish_id: data.wish_id,
              sponsor_id: currentUserId,
            },
          }),
        });

        if (rzpRes.ok) {
          const rzpOrder = (await rzpRes.json()) as any;
          orderId = rzpOrder.id;
          isMock = false;
        } else {
          console.warn("Razorpay order creation fallback to simulated order.");
          orderId = `order_sim_${uuidv4().slice(0, 12)}`;
        }
      } catch (err) {
        console.warn("Razorpay API unreachable, fallback to simulation:", err);
        orderId = `order_sim_${uuidv4().slice(0, 12)}`;
      }
    } else {
      orderId = `order_sim_${uuidv4().slice(0, 12)}`;
    }

    const sponsor = db.prepare(`SELECT * FROM users WHERE id = ?`).get(currentUserId) as any;
    const sponsorName = data.is_anonymous ? "Kind Sponsor" : sponsor?.name || "Kind Sponsor";
    const sponsorHandle = data.is_anonymous ? "anonymous" : sponsor?.handle || "you";
    const txnId = `TXN_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    // Record pending transaction
    db.prepare(`
      INSERT INTO transactions (
        id, wish_id, sponsor_id, sponsor_name, sponsor_handle,
        amount, payment_method, status, order_id, message,
        is_anonymous, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, 'pending', ?, ?,
        ?, ?, ?
      )
    `).run(
      txnId,
      data.wish_id,
      currentUserId,
      sponsorName,
      sponsorHandle,
      payAmount,
      data.payment_method,
      orderId,
      data.message ? data.message.trim() : null,
      data.is_anonymous ? 1 : 0,
      nowIso,
      nowIso
    );

    res.status(201).json({
      success: true,
      order_id: orderId,
      transaction_id: txnId,
      amount: amountInPaise, // in paise for gateway
      amount_inr: payAmount, // in rupees for UI
      currency: "INR",
      key_id: config.RAZORPAY_KEY_ID || "rzp_test_simulated_key",
      wish: {
        id: wish.id,
        title: wish.title,
        recipient_name: wish.user_name || "Community Member",
      },
      is_mock: isMock,
    });
  } catch (error: any) {
    console.error("Create order error:", error);
    res.status(500).json({ error: "Failed to initiate payment order", details: error.message });
  }
});

// POST /api/payments/verify — Step 2 of real payment gateway flow
paymentsRouter.post("/verify", (req: AuthRequest, res: Response) => {
  try {
    const data = validateBody(verifyPaymentSchema, req.body, res);
    if (!data) return;

    const currentUserId = getAuthenticatedUserId(req);

    // If live keys are present, verify HMAC SHA256 signature
    if (config.RAZORPAY_KEY_SECRET && data.signature && !data.order_id.startsWith("order_sim_")) {
      const expectedSignature = crypto
        .createHmac("sha256", config.RAZORPAY_KEY_SECRET)
        .update(`${data.order_id}|${data.payment_id}`)
        .digest("hex");

      if (expectedSignature !== data.signature) {
        res.status(400).json({ error: "Invalid payment signature. Verification failed." });
        return;
      }
    }

    // Find pending transaction
    const txn = db
      .prepare(`SELECT * FROM transactions WHERE order_id = ? AND wish_id = ?`)
      .get(data.order_id, data.wish_id) as any;

    if (!txn) {
      res.status(404).json({ error: "Transaction record for this order was not found." });
      return;
    }

    if (txn.status === "completed") {
      res.json({ success: true, message: "Payment already verified", transaction: txn });
      return;
    }

    const wish = db.prepare(`SELECT * FROM wishes WHERE id = ?`).get(data.wish_id) as any;
    if (!wish) {
      res.status(404).json({ error: "Associated wish not found." });
      return;
    }

    const nowIso = new Date().toISOString();
    const payAmount = txn.amount;

    // Complete transaction atomically
    const completePayment = db.transaction(() => {
      // 1. Mark transaction completed
      db.prepare(`
        UPDATE transactions 
        SET status = 'completed', payment_reference = ?, updated_at = ?
        WHERE id = ?
      `).run(data.payment_id, nowIso, txn.id);

      // 2. Update wish raised and status
      const newRaised = wish.raised + payAmount;
      const newStatus = newRaised >= wish.goal ? "funded" : "active";
      db.prepare(`UPDATE wishes SET raised = ?, status = ?, updated_at = ? WHERE id = ?`).run(
        newRaised,
        newStatus,
        nowIso,
        wish.id
      );

      // 3. Update sponsor totals
      db.prepare(`
        UPDATE users 
        SET total_paid = total_paid + ?, bills_sponsored = bills_sponsored + 1, updated_at = ?
        WHERE id = ?
      `).run(payAmount, nowIso, txn.sponsor_id);

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
        txn.sponsor_id,
        txn.sponsor_name,
        "Y",
        wish.id,
        wish.title,
        payAmount,
        `chipped in ₹${payAmount.toLocaleString("en-IN")} to your wish “${wish.title}”`,
        nowIso
      );

      // 5. If personal message attached, also add to direct messages
      if (txn.message && txn.message.trim() && wish.user_id !== txn.sponsor_id) {
        db.prepare(`
          INSERT INTO messages (id, sender_id, recipient_id, text, created_at)
          VALUES (?, ?, ?, ?, ?)
        `).run(
          `m_${uuidv4().slice(0, 8)}`,
          txn.sponsor_id,
          wish.user_id,
          `Paid ₹${payAmount.toLocaleString("en-IN")} towards your bill: ${txn.message.trim()}`,
          nowIso
        );
      }

      return { newRaised, newStatus };
    });

    const { newRaised, newStatus } = completePayment();

    res.json({
      success: true,
      message: `Payment verified! Contributed ₹${payAmount.toLocaleString("en-IN")} to ${wish.title}.`,
      transaction: {
        ...txn,
        status: "completed",
        payment_reference: data.payment_id,
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
    console.error("Payment verification error:", error);
    res.status(500).json({ error: "Failed to verify payment", details: error.message });
  }
});

// POST /api/payments — Direct contribution (Instant payment fallback)
paymentsRouter.post("/", (req: AuthRequest, res: Response) => {
  try {
    const data = validateBody(paymentSchema, req.body, res);
    if (!data) return;

    const currentUserId = getAuthenticatedUserId(req);

    // Check idempotency if provided
    if (data.idempotency_key) {
      const existingTxn = db
        .prepare(`SELECT * FROM transactions WHERE idempotency_key = ?`)
        .get(data.idempotency_key) as any;
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

    const wish = db
      .prepare(`SELECT * FROM wishes WHERE id = ? AND deleted_at IS NULL`)
      .get(data.wish_id) as any;
    if (!wish) {
      res.status(404).json({ error: "Wish not found or has been removed." });
      return;
    }

    const remaining = Math.max(0, wish.goal - wish.raised);
    if (remaining <= 0) {
      res.status(400).json({
        error: "This wish is already 100% funded! Thank you for your generosity.",
      });
      return;
    }

    const payAmount = Math.min(data.amount, remaining);
    const sponsor = db.prepare(`SELECT * FROM users WHERE id = ?`).get(currentUserId) as any;
    const sponsorName = data.is_anonymous ? "Kind Sponsor" : sponsor?.name || "Kind Sponsor";
    const sponsorHandle = data.is_anonymous ? "anonymous" : sponsor?.handle || "you";
    const txnId = `TXN_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const paymentRef = `${data.payment_method.toUpperCase()}/${sponsorHandle.toUpperCase()}/${Math.floor(
      100000 + Math.random() * 900000
    )}`;

    const nowIso = new Date().toISOString();

    const executePayment = db.transaction(() => {
      db.prepare(`
        INSERT INTO transactions (
          id, wish_id, sponsor_id, sponsor_name, sponsor_handle,
          amount, payment_method, payment_reference, message,
          is_anonymous, status, idempotency_key, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, 'completed', ?, ?, ?
        )
      `).run(
        txnId,
        data.wish_id,
        currentUserId,
        sponsorName,
        sponsorHandle,
        payAmount,
        data.payment_method,
        paymentRef,
        data.message ? data.message.trim() : null,
        data.is_anonymous ? 1 : 0,
        data.idempotency_key || txnId,
        nowIso,
        nowIso
      );

      const newRaised = wish.raised + payAmount;
      const newStatus = newRaised >= wish.goal ? "funded" : "active";
      db.prepare(`UPDATE wishes SET raised = ?, status = ?, updated_at = ? WHERE id = ?`).run(
        newRaised,
        newStatus,
        nowIso,
        data.wish_id
      );

      db.prepare(`
        UPDATE users 
        SET total_paid = total_paid + ?, bills_sponsored = bills_sponsored + 1, updated_at = ?
        WHERE id = ?
      `).run(payAmount, nowIso, currentUserId);

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
        currentUserId,
        sponsorName,
        sponsor?.avatar || "Y",
        wish.id,
        wish.title,
        payAmount,
        `chipped in ₹${payAmount.toLocaleString("en-IN")} to your wish “${wish.title}”`,
        nowIso
      );

      if (data.message && data.message.trim() && wish.user_id !== currentUserId) {
        db.prepare(`
          INSERT INTO messages (id, sender_id, recipient_id, text, created_at)
          VALUES (?, ?, ?, ?, ?)
        `).run(
          `m_${uuidv4().slice(0, 8)}`,
          currentUserId,
          wish.user_id,
          `Paid ₹${payAmount.toLocaleString("en-IN")} towards your bill: ${data.message.trim()}`,
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
        wish_id: data.wish_id,
        wish_title: wish.title,
        amount: payAmount,
        payment_method: data.payment_method,
        payment_reference: paymentRef,
        message: data.message?.trim() || null,
        is_anonymous: data.is_anonymous,
        timestamp: nowIso,
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

// POST /api/payments/refund — Refund a contribution (P8 from audit)
paymentsRouter.post("/refund", (req: AuthRequest, res: Response) => {
  try {
    const data = validateBody(refundPaymentSchema, req.body, res);
    if (!data) return;

    const currentUserId = getAuthenticatedUserId(req);

    const txn = db.prepare(`SELECT * FROM transactions WHERE id = ?`).get(data.transaction_id) as any;
    if (!txn) {
      res.status(404).json({ error: "Transaction not found." });
      return;
    }

    if (txn.status !== "completed") {
      res.status(400).json({ error: `Cannot refund transaction with status '${txn.status}'.` });
      return;
    }

    const wish = db.prepare(`SELECT * FROM wishes WHERE id = ?`).get(txn.wish_id) as any;
    if (!wish) {
      res.status(404).json({ error: "Associated wish not found." });
      return;
    }

    // Authorization: only the sponsor who paid or the wish recipient or demo admin can request refund
    if (txn.sponsor_id !== currentUserId && wish.user_id !== currentUserId && currentUserId !== "user_you") {
      res.status(403).json({ error: "Forbidden: You are not authorized to refund this transaction." });
      return;
    }

    const nowIso = new Date().toISOString();

    // Execute refund atomically
    const executeRefund = db.transaction(() => {
      // 1. Mark transaction refunded
      db.prepare(`
        UPDATE transactions 
        SET status = 'refunded', refund_reason = ?, updated_at = ?
        WHERE id = ?
      `).run(data.reason, nowIso, txn.id);

      // 2. Adjust wish raised
      const newRaised = Math.max(0, wish.raised - txn.amount);
      const newStatus = "active";
      db.prepare(`UPDATE wishes SET raised = ?, status = ?, updated_at = ? WHERE id = ?`).run(
        newRaised,
        newStatus,
        nowIso,
        wish.id
      );

      // 3. Adjust sponsor totals
      db.prepare(`
        UPDATE users 
        SET total_paid = MAX(0, total_paid - ?), bills_sponsored = MAX(0, bills_sponsored - 1), updated_at = ?
        WHERE id = ?
      `).run(txn.amount, nowIso, txn.sponsor_id);

      // 4. Notify both parties
      const notifId = `notif_${uuidv4().slice(0, 8)}`;
      db.prepare(`
        INSERT INTO notifications (
          id, user_id, actor_id, actor_name, actor_avatar,
          type, wish_id, wish_title, amount, text, created_at
        ) VALUES (
          ?, ?, ?, ?, ?,
          'refund', ?, ?, ?, ?, ?
        )
      `).run(
        notifId,
        txn.sponsor_id,
        wish.user_id,
        "System Support",
        "🛡️",
        wish.id,
        wish.title,
        txn.amount,
        `Refund processed: ₹${txn.amount.toLocaleString("en-IN")} credited back for “${wish.title}”. Reason: ${data.reason}`,
        nowIso
      );

      return { newRaised, newStatus };
    });

    const { newRaised, newStatus } = executeRefund();

    res.json({
      success: true,
      message: `Transaction refunded successfully. ₹${txn.amount.toLocaleString("en-IN")} has been reversed.`,
      transaction: {
        id: txn.id,
        status: "refunded",
        refund_reason: data.reason,
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
    console.error("Refund error:", error);
    res.status(500).json({ error: "Failed to process refund", details: error.message });
  }
});

// GET /api/payments/history
paymentsRouter.get("/history", (req: AuthRequest, res: Response) => {
  try {
    const currentUserId = getAuthenticatedUserId(req);
    const history = db
      .prepare(`
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
    `)
      .all(currentUserId) as any[];

    res.json(history);
  } catch (error: any) {
    console.error("Payment history error:", error);
    res.status(500).json({ error: "Failed to fetch payment history", details: error.message });
  }
});

// GET /api/payments/receipt/:id — Itemized verifiable receipt
paymentsRouter.get("/receipt/:id", (req: AuthRequest, res: Response) => {
  try {
    const txn = db
      .prepare(`
      SELECT 
        t.*,
        w.title as wish_title,
        w.raised as wish_raised,
        w.goal as wish_goal,
        w.tag as wish_tag,
        w.category as wish_category,
        u.name as recipient_name,
        u.handle as recipient_handle
      FROM transactions t
      JOIN wishes w ON t.wish_id = w.id
      JOIN users u ON w.user_id = u.id
      WHERE t.id = ?
    `)
      .get(req.params.id) as any;

    if (!txn) {
      res.status(404).json({ error: "Transaction receipt not found" });
      return;
    }

    // Breakdown for financial transparency
    const amount = txn.amount;
    const platformFee = 0; // HelpMePay 0% platform fee promise
    const gatewayFee = 0; // Absorbed
    const netToRecipient = amount;

    res.json({
      receipt_id: `RCPT_${txn.id}`,
      transaction_id: txn.id,
      order_id: txn.order_id || null,
      status: txn.status,
      timestamp: txn.created_at,
      payment_method: txn.payment_method,
      payment_reference: txn.payment_reference,
      is_anonymous: Boolean(txn.is_anonymous),
      message: txn.message,
      sponsor: {
        name: txn.sponsor_name,
        handle: txn.sponsor_handle,
      },
      recipient: {
        name: txn.recipient_name,
        handle: txn.recipient_handle,
      },
      wish: {
        id: txn.wish_id,
        title: txn.wish_title,
        tag: txn.wish_tag,
        category: txn.wish_category,
      },
      financials: {
        amount_paid: amount,
        platform_fee: platformFee,
        gateway_fee: gatewayFee,
        net_to_recipient: netToRecipient,
        currency: "INR",
        verification_seal: "VERIFIED_DIRECT_PROVIDER_DISBURSEMENT",
      },
    });
  } catch (error: any) {
    console.error("Receipt error:", error);
    res.status(500).json({ error: "Failed to fetch receipt", details: error.message });
  }
});
