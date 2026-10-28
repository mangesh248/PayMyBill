/**
 * Environment configuration — single source of truth for all env vars.
 * Validates required values at startup and provides typed access.
 */
import dotenv from "dotenv";
dotenv.config();

export const config = {
  // Server
  PORT: parseInt(process.env.PORT || "5000", 10),
  NODE_ENV: process.env.NODE_ENV || "development",

  // Auth / JWT
  JWT_SECRET: process.env.JWT_SECRET || "dev-secret-change-me-in-production",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || "30d",

  // CORS
  CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:8080",

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10), // 15 min
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100", 10),
  AUTH_RATE_LIMIT_MAX: parseInt(process.env.AUTH_RATE_LIMIT_MAX || "20", 10), // stricter for login/register

  // Payment Gateway (placeholder for Phase 2)
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || "",
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || "",
} as const;

// Warn in production if using dev defaults
if (config.NODE_ENV === "production") {
  const warnings: string[] = [];
  if (config.JWT_SECRET === "dev-secret-change-me-in-production") {
    warnings.push("JWT_SECRET is using the default dev secret!");
  }
  if (!config.RAZORPAY_KEY_ID) {
    warnings.push("RAZORPAY_KEY_ID is not set — payments will not work.");
  }
  if (warnings.length > 0) {
    console.warn("⚠️  PRODUCTION WARNINGS:");
    warnings.forEach((w) => console.warn(`   - ${w}`));
  }
}
