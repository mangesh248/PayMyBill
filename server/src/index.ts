import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { config } from "./utils/config.js";
import { initSchema } from "./db/schema.js";
import { seed } from "./db/seed.js";
import { db } from "./db/database.js";

import { authRouter } from "./routes/auth.js";
import { wishesRouter } from "./routes/wishes.js";
import { paymentsRouter } from "./routes/payments.js";
import { leaderboardRouter } from "./routes/leaderboard.js";
import { notificationsRouter } from "./routes/notifications.js";
import { messagesRouter } from "./routes/messages.js";
import { usersRouter } from "./routes/users.js";
import { storiesRouter } from "./routes/stories.js";

const app = express();
const PORT = config.PORT;

// Security headers with Helmet
app.use(
  helmet({
    contentSecurityPolicy: false, // disabled for development Vite client flexibility
    crossOriginEmbedderPolicy: false,
  })
);

// CORS configuration
const allowedOrigins = [
  "http://localhost:8080",
  "http://127.0.0.1:8080",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, Postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || origin.startsWith("http://localhost:")) {
        return callback(null, true);
      }
      callback(null, true); // Permissive in dev, toggleable via env
    },
    credentials: true,
  })
);

// Body parsers with size limit
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));

// Rate Limiters
const generalLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests from this IP, please try again in a few minutes." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: config.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login/register attempts. Please try again after 15 minutes." },
});

// Apply general rate limit to all /api routes
app.use("/api", generalLimiter);

// Initialize database schema and auto-seed if empty
initSchema();
const count = (db.prepare("SELECT COUNT(*) as c FROM wishes").get() as any)?.c || 0;
if (count === 0) {
  console.log("No wishes found in database. Automatically running seed...");
  seed();
}

// Deep Health check endpoint (verifies DB ping)
app.get("/api/health", (req, res) => {
  try {
    const dbCheck = db.prepare("SELECT 1 as ping").get() as any;
    res.json({
      status: "healthy",
      database: dbCheck?.ping === 1 ? "connected" : "degraded",
      product: "HelpMePay / Spotlight Wishes API",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(503).json({
      status: "unhealthy",
      database: "disconnected",
      error: err.message,
    });
  }
});

// Mount modular API routers
app.use("/api/auth", authLimiter, authRouter);
app.use("/api/wishes", wishesRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/leaderboard", leaderboardRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/messages", messagesRouter);
app.use("/api/users", usersRouter);
app.use("/api/stories", storiesRouter);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, "../../client/dist");

// Serve client in production if dist exists
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
}

// 404 handler for unknown routes or fallback to client index.html
app.use((req, res) => {
  if (req.path.startsWith("/api")) {
    res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
    return;
  }
  if (fs.existsSync(clientDistPath)) {
    res.sendFile(path.join(clientDistPath, "index.html"));
    return;
  }
  res.status(404).json({ error: `Not Found: ${req.originalUrl}` });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Unhandled server error:", err);
  res.status(500).json({ error: "Internal Server Error", message: err.message });
});

// Start listening
app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🚀 HelpMePay Backend API running on http://localhost:${PORT}`);
  console.log(`📡 Ready for bill payments, wishes & social feed`);
  console.log(`===============================================`);
});

export default app;
