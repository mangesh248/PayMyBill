# 💸 HelpMePay (Spotlight Wishes)

> **Swipe. Smile. Support.** — A social crowdfunding and bill sponsorship platform where users share everyday expenses, bills, and micro-wishes, and verified sponsors fund them directly.

---

## 🚀 Key Features & Architectural Highlights

### 🛡️ 1. Security & Identity
- **JWT Authentication:** Strict Bearer token authorization using `jsonwebtoken` with fallback to demo profile for offline DX.
- **Argon2/Bcrypt Password Security:** Password hashing via `bcryptjs` with salt rounds = 10.
- **Strict Input Validation:** Powered by `zod` schemas for authentication, wish creation, transactions, comments, and messages.
- **Defense in Depth:** Configured with `helmet` security headers, CORS origin whitelisting, and strict rate limiters for both general API traffic and authentication routes.
- **Ownership Enforcement:** Guaranteed delete and update permissions check before modifying user resources.

### 💳 2. Payment Gateway & Financial Integrity
- **2-Step Payment Gateway:** Full order initiation (`/api/payments/create-order`) and cryptographic signature verification (`/api/payments/verify`).
- **Paise Precision:** Financial calculations performed in integer subunits (paise / cents) to prevent IEEE-754 floating-point inaccuracies.
- **Built-in UPI/QR Simulator:** Seamless testing with simulated Indian UPI / QR dynamic codes, alongside Razorpay integration hooks.
- **Atomic Transactions & Refunds:** SQLite atomic write locks prevent race conditions; full refund flow (`/api/payments/refund`) with automatic wish progress decrement.
- **Itemized Receipts:** Complete downloadable and printable digital receipts (`/api/payments/receipt/:id`) featuring payment breakdown, timestamp, platform fee, and sponsor credit.

### 🌐 3. Scalable Database & Social Feed
- **Followers Social Graph:** Dedicated `follows` relational table with toggle follow/unfollow API, notification generation, and customized `Friends` feed.
- **High-Performance Pagination:** Offset/limit pagination with `X-Total-Count`, `X-Page`, and `X-Limit` headers on `/api/wishes`.
- **Dynamic Trending Emergencies:** Real-time SQL aggregation (`/api/wishes/trending`) calculates hot categories, goal fulfillment percentages, and active urgent requests.
- **Server-Side Urgency Sorting:** Sort wishes dynamically by remaining funding deficit or popularity.
- **Rich Emoji Reactions:** Multi-emoji support (❤️, 👏, 🔥, 🚀, 😢, 🙌) stored in an indexed `reactions` table.

---

## 🛠️ Technology Stack

- **Frontend:** React 19, Vite, TanStack Router, TanStack Query, Tailwind CSS v4, Lucide Icons, Sonner Toaster.
- **Backend:** Node.js, Express v5, Better-SQLite3, Zod v4, Helmet, Express Rate Limit, JWT, BcryptJS.
- **DevOps:** Multi-stage Dockerfile, Docker Compose with persistent SQLite volume, Concurrently.

---

## 📦 Getting Started

### Prerequisites
- Node.js >= 20
- npm >= 10

### 1. Clone & Install
```bash
git clone https://github.com/mangesh248/PayMyBill.git
cd PayMyBill
npm run install:all
```

### 2. Configure Environment
Copy the example environment configuration:
```bash
cp .env.example server/.env
```

### 3. Run Development Servers
Start both the API backend (`http://localhost:5000`) and the Vite web client (`http://localhost:8080`):
```bash
npm run dev
```

### 4. Seed Demo Data (Optional)
To re-seed demo users, wishes, and transactions:
```bash
npm run seed
```
Demo accounts:
- **Tanya Sharma:** handle `@tanya_s` / password `password123`
- **Arjun Mehta:** handle `@arjun_m` / password `password123`
- **Priya Patel:** handle `@priya_p` / password `password123`

---

## 🐳 Docker Deployment

Run the complete production stack (Client + API + Persistent DB) using Docker Compose:

```bash
docker compose up --build -d
```
The application will be live at `http://localhost:5000` with automated health checks enabled at `/api/health`.

---

## 📡 Key API Endpoints

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register a new user | No |
| `POST` | `/api/auth/login` | Log in and receive JWT token | No |
| `GET` | `/api/auth/me` | Fetch authenticated user info | Yes |
| `GET` | `/api/wishes` | Fetch wishes (supports `?page=`, `?limit=`, `?sort=urgent`, `?tab=Friends`) | Optional |
| `GET` | `/api/wishes/trending` | Get aggregated trending categories & urgent bills | No |
| `POST` | `/api/wishes` | Create a new wish / bill request | Yes |
| `POST` | `/api/wishes/:id/react` | Toggle emoji reaction | Yes |
| `POST` | `/api/payments/create-order` | Create payment gateway order | Yes |
| `POST` | `/api/payments/verify` | Verify payment signature and complete transaction | Yes |
| `POST` | `/api/payments/refund` | Refund completed transaction | Yes |
| `GET` | `/api/payments/receipt/:id` | Retrieve digital transaction receipt | No |
| `POST` | `/api/users/:id/follow` | Toggle follow/unfollow user | Yes |
| `GET` | `/api/health` | Deep health check (DB connectivity & status) | No |

---

## 🧪 Testing

Run the test suite across components and routing:
```bash
npm test
```

To run type checks across both packages:
```bash
npm --prefix server run build
npm --prefix client run build
```

---

## 📄 License
MIT © 2026 HelpMePay Contributors.
