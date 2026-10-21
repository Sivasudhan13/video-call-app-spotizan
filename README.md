# video-call-app-spotizan

**Spotizan** is a complete, production-ready, adult social discovery and random video/audio calling platform built with the MERN stack (MongoDB, Express, React, Node.js), WebRTC, Socket.IO, Tailwind CSS, and Razorpay.

Spotizan features an original brand identity, strict legal compliance architecture, real-time in-call text chat, block & report moderation, a 15-second free preview guarantee, an integer-paise double-entry wallet ledger, and optional creator monetization with 70% revenue share.

---

## 🌟 Key Features

1. **Random 1-on-1 Video Matching:**
   - Real WebRTC audio & video with Google STUN / TURN fallback.
   - 15-second free preview guarantee on every random connection.
   - Priority queue for Premium and VIP members.
   - 2-minute anti-spam peer cooldown and automatic blocked-user exclusion.
2. **In-Call Real-Time Text Chat:**
   - Slide-in live chat drawer during video calls.
   - Typing indicators and 24-hour automatic TTL database message expiration.
3. **Safety & Moderation:**
   - Statutory 18+ legal age affirmation on registration and socket handshake.
   - In-call 1-click **Block & Next** (permanently prevents re-matching).
   - In-call **Submit Report** with category selection for admin investigation.
   - Admin review console for reports, bans, and creator KYC verification.
4. **Role Enforcement:**
   - Female accounts strictly hold the `CREATOR` role (unless system `ADMIN`).
   - Male accounts hold the `CUSTOMER` role.
   - Staff accounts hold the `ADMIN` role.
5. **Creator Monetization & Payouts:**
   - Onboarding KYC verification queue with document review.
   - Configurable per-minute call rates (promotional ₹7/min default).
   - 70% creator share credited in integer paise.
   - Payout requests to UPI or Bank Transfer (minimum ₹500).
6. **Razorpay Standard Web Checkout Integration:**
   - Test payment support starting at ₹1.00 (100 paise) up to ₹5,000.
   - Backend order creation (`POST /api/create-order`).
   - Timing-safe HMAC-SHA256 signature verification (`POST /api/verify-payment`).
   - Webhook processing with idempotency.

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js v18+
- MongoDB instance running locally on `mongodb://127.0.0.1:27017` or MongoDB Atlas URI

### 1. Clone & Install Dependencies
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Environment Configuration
Verify `backend/.env`:
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
MONGODB_URI=mongodb://127.0.0.1:27017/spotizan_dev
JWT_SECRET=spotizan_dev_super_secret_jwt_key_2026_test_only
COOKIE_SECRET=spotizan_dev_cookie_secret_key_32_bytes_long
RAZORPAY_KEY_ID=rzp_test_TqNg9cUMAFo05g
RAZORPAY_KEY_SECRET=51Xfotxl6asYIMxZv7nf164S
```

### 3. Seed Admin Credentials
```bash
cd backend
node src/scripts/seedAdmin.js
```
Default Administrator Account:
- **Email:** `admin@spotizan.com`
- **Password:** `Admin@Spotizan123!`

### 4. Run Development Servers
```bash
# In backend terminal:
npm run dev
# Running on http://localhost:5000

# In frontend terminal:
npm run dev
# Running on http://localhost:5173
```

---

## 🧪 Testing Suite

### Run All Backend Tests (56 tests across 6 test suites)
```bash
cd backend
npm test
```
Verifies:
- `auth.test.js`: 18+ registration, role enforcement, login, cookies.
- `creator.test.js`: Female creator role validation, KYC verification, availability.
- `webrtc.test.js`: Socket authentication, matchmaking queue, WebRTC signaling, call lifecycle.
- `razorpay.test.js`: ₹1 test order creation, HMAC-SHA256 signature verification, wallet crediting.
- `wallet.test.js`: Ledger entries, call reservation, settlement, creator revenue share.
- `health.test.js`: API status & route handling.

### Run Frontend Tests
```bash
cd frontend
npm test
```

---

## 📂 Project Directory Structure

```
spotizan/
├── backend/
│   ├── src/
│   │   ├── config/             # DB, environment & Razorpay setup
│   │   ├── controllers/        # Auth, call, creator, payment, moderation
│   │   ├── middlewares/        # JWT auth, 18+ age checks, rate limiters
│   │   ├── models/             # User, CallSession, ChatMessage, UserBlock, etc.
│   │   ├── realtime/           # MatchmakingQueue & Socket.IO server
│   │   ├── routes/             # Express API routes
│   │   ├── services/           # Wallet, subscription, call billing services
│   │   ├── app.js              # Express app definition
│   │   └── server.js           # HTTP + Socket.IO server entrypoint
│   └── tests/                  # Vitest backend integration test suite
├── frontend/
│   ├── src/
│   │   ├── components/         # Layout, buttons, badges, wallet, modals
│   │   ├── context/            # AuthContext, WalletContext
│   │   ├── hooks/              # useWebRTC (video, chat, block, report)
│   │   ├── pages/              # Landing, Queue, Discover, Creator, Admin, Premium, Safety
│   │   ├── services/           # Axios API client, Socket.IO client
│   │   ├── App.jsx             # React Router routing
│   │   └── main.jsx
│   └── tests/                  # Vitest frontend tests
└── docs/                       # Architecture, API, database, deployment guides
```

---

## 🛡️ License & Compliance
Operating exclusively under consenting adult (18+) terms in adherence with Indian IT Intermediary Rules, 2021, and DPDP Act, 2023.
