# Spotizan Production Deployment & Infrastructure Guide

This guide details hosting, environment setup, TURN relay bandwidth, media infrastructure, and scaling requirements.

---

## 1. Environment Topology

- **Frontend:** Vercel or Cloudflare Pages (`https://app.spotizan.com`)
- **Backend API & WebSockets:** Render, Railway, or AWS ECS Fargate (`https://api.spotizan.com`)
- **Database:** MongoDB Atlas M10+ replica set (`mongodb+srv://...`)
- **Redis Cluster:** Managed Upstash or AWS ElastiCache for distributed queue state and cross-node socket signaling
- **Payment Gateway:** Razorpay Standard Web Checkout
- **Media & TURN Relays:** Coturn or Metered.ca TURN servers

---

## 2. TURN Server & Real-Time Bandwidth Planning

### Why STUN Alone Is Not Enough
- **Symmetric NATs & Restrictive Mobile Firewalls:** While ~80% of peer connections succeed via Google STUN, approximately 15–25% of mobile cellular connections (e.g. Jio/Airtel carrier-grade NATs) require a TURN relay server to proxy encrypted media packets.
- **Bandwidth Consumption Estimate:**
  - Standard 720p 30fps VP8/H.264 video + Opus audio stream consumes ~1.2 Mbps per peer (2.4 Mbps bidirectional).
  - 1 hour of relayed video call = ~1.08 GB of TURN bandwidth.
  - At 1,000 concurrent relayed calls, required relay throughput = 2.4 Gbps.

### Secure Ephemeral TURN Credentials (RFC 5766)
Do NOT expose long-lived static TURN credentials in frontend code. Generate time-limited HMAC credentials dynamically:
```javascript
import crypto from 'crypto';

export function getTurnCredentials(username, secret, ttlSeconds = 86400) {
  const timestamp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const turnUsername = `${timestamp}:${username}`;
  const hmac = crypto.createHmac('sha1', secret);
  hmac.update(turnUsername);
  const credential = hmac.digest('base64');
  return { username: turnUsername, credential };
}
```

---

## 3. Deployment Checklist

### Step 1: Environment Variables Setup
Ensure all secrets are defined in production hosting:
```bash
# Backend (.env)
PORT=5000
NODE_ENV=production
CLIENT_URL=https://app.spotizan.com
MONGODB_URI=mongodb+srv://spotizan_admin:<password>@cluster0.mongodb.net/spotizan_prod
JWT_SECRET=super_strong_crypto_random_jwt_secret_64_bytes
COOKIE_SECRET=super_strong_cookie_signing_secret_64_bytes
RAZORPAY_KEY_ID=rzp_live_your_actual_key_id
RAZORPAY_KEY_SECRET=your_actual_secret
RAZORPAY_WEBHOOK_SECRET=your_actual_webhook_secret
TURN_SERVER_URLS=turn:relay.spotizan.com:3478
TURN_SECRET=your_shared_turn_secret
```

### Step 2: Seed Initial Administrator
Run the admin seed script:
```bash
cd backend
node src/scripts/seedAdmin.js
```
Default credentials: `admin@spotizan.com` / `Admin@Spotizan123!` (Rotate immediately after first login).

### Step 3: Frontend Build Validation
```bash
cd frontend
npm run build
```
Verify the generated `dist/` directory outputs optimized bundles.
