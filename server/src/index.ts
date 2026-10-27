import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { initSchema } from "./db/schema.js";
import { seed } from "./db/seed.js";
import { db } from "./db/database.js";

import { wishesRouter } from "./routes/wishes.js";
import { paymentsRouter } from "./routes/payments.js";
import { leaderboardRouter } from "./routes/leaderboard.js";
import { notificationsRouter } from "./routes/notifications.js";
import { messagesRouter } from "./routes/messages.js";
import { usersRouter } from "./routes/users.js";
import { storiesRouter } from "./routes/stories.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS and body parsers
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize database schema and auto-seed if empty
initSchema();
const count = (db.prepare("SELECT COUNT(*) as c FROM wishes").get() as any)?.c || 0;
if (count === 0) {
  console.log("No wishes found in database. Automatically running seed...");
  seed();
}

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    product: "HelpMePay / Spotlight Wishes API",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// Mount modular API routers
app.use("/api/wishes", wishesRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/leaderboard", leaderboardRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/messages", messagesRouter);
app.use("/api/users", usersRouter);
app.use("/api/stories", storiesRouter);

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
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
