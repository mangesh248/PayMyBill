/**
 * JWT Authentication Middleware
 *
 * Provides:
 * - `requireAuth`: Blocks unauthenticated requests (401)
 * - `optionalAuth`: Attaches user if token present, continues otherwise
 * - `generateToken` / `generateRefreshToken`: Token creation helpers
 * - `AuthRequest`: Extended Express Request with `user` property
 */
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../utils/config.js";

export interface AuthUser {
  id: string;
  handle: string;
  name: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return null;
}

function verifyToken(token: string): AuthUser | null {
  try {
    const payload = jwt.verify(token, config.JWT_SECRET) as AuthUser;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Strict auth guard — returns 401 if no valid token.
 */
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ error: "Authentication required. Please log in." });
    return;
  }

  const user = verifyToken(token);
  if (!user) {
    res.status(401).json({ error: "Invalid or expired token. Please log in again." });
    return;
  }

  req.user = user;
  next();
}

/**
 * Soft auth — attaches user if token present, but doesn't block.
 * Useful for public endpoints that behave differently when logged in.
 */
export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (token) {
    const user = verifyToken(token);
    if (user) {
      req.user = user;
    }
  }
  next();
}

/**
 * Resolves current user id from JWT auth token, or falls back to 'user_you' for unauthenticated/demo requests.
 */
export function getAuthenticatedUserId(req: AuthRequest, fallbackDemoId = "user_you"): string {
  if (req.user?.id) {
    return req.user.id;
  }
  const token = extractToken(req);
  if (token) {
    const verified = verifyToken(token);
    if (verified) {
      req.user = verified;
      return verified.id;
    }
  }
  return fallbackDemoId;
}

/**
 * Generate a short-lived access token.
 */
export function generateToken(user: AuthUser): string {
  const options: jwt.SignOptions = { expiresIn: config.JWT_EXPIRES_IN as any };
  return jwt.sign(
    { id: user.id, handle: user.handle, name: user.name },
    config.JWT_SECRET,
    options
  );
}

/**
 * Generate a long-lived refresh token.
 */
export function generateRefreshToken(user: AuthUser): string {
  const options: jwt.SignOptions = { expiresIn: config.JWT_REFRESH_EXPIRES_IN as any };
  return jwt.sign(
    { id: user.id, handle: user.handle, name: user.name },
    config.JWT_SECRET,
    options
  );
}
