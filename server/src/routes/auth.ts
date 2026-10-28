/**
 * Authentication routes — register, login, refresh token, get current user.
 */
import { Router, Response } from "express";
import bcrypt from "bcryptjs";
import { db } from "../db/database.js";
import { v4 as uuidv4 } from "uuid";
import { type AuthRequest, requireAuth, generateToken, generateRefreshToken } from "../middleware/auth.js";
import { registerSchema, loginSchema, validateBody } from "../validators/schemas.js";

export const authRouter = Router();

const SALT_ROUNDS = 12;

// POST /api/auth/register
authRouter.post("/register", async (req: AuthRequest, res: Response) => {
  try {
    const data = validateBody(registerSchema, req.body, res);
    if (!data) return;

    // Check handle uniqueness
    const existing = db.prepare("SELECT id FROM users WHERE handle = ?").get(data.handle) as any;
    if (existing) {
      res.status(409).json({ error: "Handle already taken. Try another one." });
      return;
    }

    const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);
    const userId = `user_${uuidv4().slice(0, 12)}`;
    const avatar = data.name.trim()[0]?.toUpperCase() || "U";

    db.prepare(`
      INSERT INTO users (id, name, handle, avatar, bio, password_hash, total_paid, bills_sponsored, followers_count)
      VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0)
    `).run(userId, data.name, data.handle, avatar, data.bio || "", hashedPassword);

    const user = { id: userId, handle: data.handle, name: data.name };
    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    res.status(201).json({
      success: true,
      message: "Account created successfully! Welcome to HelpMePay 🎉",
      token,
      refreshToken,
      user: {
        id: userId,
        name: data.name,
        handle: data.handle,
        avatar,
      },
    });
  } catch (error: any) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Failed to create account", details: error.message });
  }
});

// POST /api/auth/login
authRouter.post("/login", async (req: AuthRequest, res: Response) => {
  try {
    const data = validateBody(loginSchema, req.body, res);
    if (!data) return;

    const user = db.prepare("SELECT * FROM users WHERE handle = ?").get(data.handle) as any;
    if (!user || !user.password_hash) {
      res.status(401).json({ error: "Invalid handle or password." });
      return;
    }

    const validPassword = await bcrypt.compare(data.password, user.password_hash);
    if (!validPassword) {
      res.status(401).json({ error: "Invalid handle or password." });
      return;
    }

    const authUser = { id: user.id, handle: user.handle, name: user.name };
    const token = generateToken(authUser);
    const refreshToken = generateRefreshToken(authUser);

    res.json({
      success: true,
      message: "Logged in successfully!",
      token,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        handle: user.handle,
        avatar: user.avatar,
        bio: user.bio,
      },
    });
  } catch (error: any) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed", details: error.message });
  }
});

// GET /api/auth/me — get current authenticated user
authRouter.get("/me", requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const user = db.prepare(
      "SELECT id, name, handle, avatar, bio, total_paid, bills_sponsored, followers_count FROM users WHERE id = ?"
    ).get(req.user!.id) as any;

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({ user });
  } catch (error: any) {
    console.error("Auth /me error:", error);
    res.status(500).json({ error: "Failed to fetch user", details: error.message });
  }
});

// POST /api/auth/refresh — issue new tokens from a valid refresh token
authRouter.post("/refresh", requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);
    res.json({ token, refreshToken });
  } catch (error: any) {
    console.error("Token refresh error:", error);
    res.status(500).json({ error: "Failed to refresh token", details: error.message });
  }
});
