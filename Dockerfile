# ==========================================
# Stage 1: Build Frontend (Vite Client)
# ==========================================
FROM node:22-alpine AS client-builder
WORKDIR /app/client

COPY client/package*.json ./
RUN npm ci

COPY client/ ./
RUN npm run build

# ==========================================
# Stage 2: Build Backend Server
# ==========================================
FROM node:22-alpine AS server-builder
WORKDIR /app/server

# Install python and C++ tools required for compiling better-sqlite3
RUN apk add --no-cache python3 make g++

COPY server/package*.json ./
RUN npm ci

COPY server/ ./
RUN npx tsc

# ==========================================
# Stage 3: Production Runner
# ==========================================
FROM node:22-alpine AS runner
WORKDIR /app

# SQLite runtime dependency
RUN apk add --no-cache python3 make g++ curl

ENV NODE_ENV=production
ENV PORT=5000

# Copy server production package & install production deps only
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev

# Copy compiled backend
COPY --from=server-builder /app/server/dist ./dist
COPY --from=server-builder /app/server/src ./src

# Copy built frontend into client/dist so server can serve it statically
WORKDIR /app
COPY --from=client-builder /app/client/dist ./client/dist

# Expose port
EXPOSE 5000

# Health check against live database ping
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

WORKDIR /app/server
CMD ["node", "dist/index.js"]
