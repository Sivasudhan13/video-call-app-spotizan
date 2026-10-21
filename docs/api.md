# Spotizan REST API Reference

Base URL: `http://localhost:5000/api` (Local) or `https://api.spotizan.com/api` (Production)

---

## 1. Authentication (`/api/auth`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register customer or creator account with statutory 18+ declaration | No |
| `POST` | `/api/auth/login` | Log in and receive HttpOnly signed JWT cookie | No |
| `GET` | `/api/auth/me` | Retrieve authenticated user profile and subscription status | Yes |
| `POST` | `/api/auth/logout` | Clear session cookie | Yes |

---

## 2. Calls & WebRTC Signaling (`/api/calls`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/calls/ice-servers` | Get configured STUN/TURN server list | Yes (18+ Verified) |
| `POST` | `/api/calls/request` | Request direct call with a creator | Yes |
| `GET` | `/api/calls/history` | View recent call history and billed durations | Yes |

---

## 3. Payments & Razorpay (`/api`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/create-order` | Create Razorpay standard checkout order (>= 100 paise) | Yes |
| `POST` | `/api/verify-payment` | Verify HMAC-SHA256 signature and credit wallet balance | Yes |
| `POST` | `/api/razorpay-webhook` | Process server-side gateway webhook events | No (HMAC checked) |

---

## 4. Wallet & Balances (`/api/wallet`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/wallet` | Get user wallet balance, reserved funds, and creator earnings | Yes |
| `GET` | `/api/wallet/transactions` | Retrieve immutable ledger transaction history | Yes |

---

## 5. Subscriptions (`/api/subscriptions`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/subscriptions/plans` | View available subscription tiers (Free, Premium, VIP) | No |
| `GET` | `/api/subscriptions/me` | View current user membership status | Yes |
| `POST` | `/api/subscriptions/checkout` | Create subscription Razorpay order | Yes |
| `POST` | `/api/subscriptions/verify` | Verify subscription payment and activate benefits | Yes |

---

## 6. Safety & Moderation (`/api`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/blocks` | Block a user by `blockedUserId` | Yes |
| `GET` | `/api/blocks` | List user's active blocked peers | Yes |
| `DELETE` | `/api/blocks/:id` | Remove a block | Yes |
| `POST` | `/api/reports` | Report inappropriate behavior or suspected violations | Yes |
| `GET` | `/api/admin/reports` | Admin review queue for community reports | Yes (ADMIN) |

---

## 7. Creator & Admin Management (`/api/creators`, `/api/admin`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/creators/discover` | Discover online verified creators | Yes |
| `POST` | `/api/creators/apply-verification` | Submit KYC documentation for verification | Yes (CREATOR) |
| `PATCH` | `/api/creators/me/availability` | Toggle online/offline and set per-minute rate | Yes (CREATOR) |
| `POST` | `/api/creators/request-payout` | Request withdrawal of earnings (min ₹500) | Yes (CREATOR) |
| `GET` | `/api/admin/verification-queue` | View pending creator KYC applications | Yes (ADMIN) |
| `POST` | `/api/admin/verify-creator/:id` | Approve or reject creator KYC application | Yes (ADMIN) |
| `GET` | `/api/admin/payout-requests` | View pending creator payout requests | Yes (ADMIN) |
| `POST` | `/api/admin/process-payout/:id` | Process or reject creator payout | Yes (ADMIN) |
