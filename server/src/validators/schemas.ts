/**
 * Zod validation schemas for all API request bodies.
 * Centralizes input validation — each route calls `schema.parse(req.body)`.
 */
import { z } from "zod";

// ──────────────────────────── Auth ────────────────────────────
export const registerSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be at most 50 characters")
    .trim(),
  handle: z
    .string()
    .min(3, "Handle must be at least 3 characters")
    .max(30, "Handle must be at most 30 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Handle can only contain letters, numbers, and underscores")
    .trim()
    .toLowerCase(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be at most 128 characters"),
  bio: z.string().max(200, "Bio must be at most 200 characters").optional(),
});

export const loginSchema = z.object({
  handle: z.string().min(1, "Handle is required").trim().toLowerCase(),
  password: z.string().min(1, "Password is required"),
});

// ──────────────────────────── Wishes ────────────────────────────
export const createWishSchema = z.object({
  title: z
    .string()
    .min(5, "Title must be at least 5 characters")
    .max(150, "Title must be at most 150 characters")
    .trim(),
  body: z
    .string()
    .min(20, "Description must be at least 20 characters")
    .max(2000, "Description must be at most 2000 characters")
    .trim(),
  tag: z.string().max(40).optional(),
  category: z.string().max(40).optional(),
  goal: z
    .coerce
    .number()
    .int("Goal must be a whole number")
    .min(100, "Goal must be at least ₹100")
    .max(500000, "Goal must be at most ₹5,00,000"),
  img: z.string().url("Image must be a valid URL").optional(),
  provider_name: z.string().max(80).optional(),
  bill_reference: z.string().max(80).optional(),
});

export const reportWishSchema = z.object({
  reason: z.enum(["fraud", "inappropriate", "duplicate", "impersonation", "other"]),
  details: z.string().max(500).optional(),
});

// ──────────────────────────── Payments ────────────────────────────
export const paymentSchema = z.object({
  wish_id: z.string().min(1, "Wish ID is required"),
  amount: z
    .coerce
    .number()
    .int("Amount must be a whole number")
    .min(10, "Minimum contribution is ₹10")
    .max(100000, "Maximum contribution is ₹1,00,000"),
  payment_method: z.enum(["upi", "card", "netbanking", "wallet", "instant"]).default("upi"),
  message: z.string().max(300, "Message must be at most 300 characters").optional(),
  is_anonymous: z.boolean().default(false),
  idempotency_key: z.string().max(100).optional(),
});

export const createOrderSchema = z.object({
  wish_id: z.string().min(1, "Wish ID is required"),
  amount: z
    .coerce
    .number()
    .int("Amount must be a whole number")
    .min(10, "Minimum contribution is ₹10")
    .max(100000, "Maximum contribution is ₹1,00,000"),
  payment_method: z.enum(["upi", "card", "netbanking", "wallet", "instant"]).default("upi"),
  message: z.string().max(300, "Message must be at most 300 characters").optional(),
  is_anonymous: z.boolean().default(false),
});

export const verifyPaymentSchema = z.object({
  order_id: z.string().min(1, "Order ID is required"),
  payment_id: z.string().min(1, "Payment ID is required"),
  signature: z.string().optional(),
  wish_id: z.string().min(1, "Wish ID is required"),
});

export const refundPaymentSchema = z.object({
  transaction_id: z.string().min(1, "Transaction ID is required"),
  reason: z.string().min(3, "Reason must be at least 3 characters").max(300),
});

// ──────────────────────────── Comments ────────────────────────────
export const commentSchema = z.object({
  text: z
    .string()
    .min(1, "Comment cannot be empty")
    .max(1000, "Comment must be at most 1000 characters")
    .trim(),
});

// ──────────────────────────── Messages ────────────────────────────
export const sendMessageSchema = z.object({
  recipient_id: z.string().optional(),
  recipient_name: z.string().optional(),
  text: z
    .string()
    .min(1, "Message cannot be empty")
    .max(2000, "Message must be at most 2000 characters")
    .trim(),
}).refine(
  (data) => data.recipient_id || data.recipient_name,
  { message: "Either recipient_id or recipient_name is required" }
);

// ──────────────────────────── Stories ────────────────────────────
export const createStorySchema = z.object({
  title: z
    .string()
    .min(2, "Story title must be at least 2 characters")
    .max(60, "Story title must be at most 60 characters")
    .trim(),
});

// ──────────────────────────── Helpers ────────────────────────────
/**
 * Validate request body against a Zod schema.
 * Returns parsed data or sends a 400 error response.
 */
export function validateBody<T>(
  schema: z.ZodSchema<T>,
  body: unknown,
  res: import("express").Response
): T | null {
  const result = schema.safeParse(body);
  if (!result.success) {
    const errors = result.error.issues.map((i) => ({
      field: i.path.join("."),
      message: i.message,
    }));
    res.status(400).json({
      error: "Validation failed",
      details: errors,
    });
    return null;
  }
  return result.data;
}
