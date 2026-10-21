# Spotizan Database Models & Mongoose Schemas

All models are defined with Mongoose ODM in `backend/src/models/`.

---

## 1. Primary Schemas Overview

### A. User (`backend/src/models/User.js`)
- **Key Fields:** `displayName`, `email`, `password` (select: false), `gender` (`FEMALE`, `MALE`, `OTHER`), `role` (`CUSTOMER`, `CREATOR`, `ADMIN`), `dateOfBirth`, `isAdult`, `ageAffirmation`, `subscriptionTier` (`FREE`, `PREMIUM`, `VIP`), `isPremium`.
- **Pre-Validate Hook:** Enforces that female accounts automatically hold the `CREATOR` role (unless staff `ADMIN`).
- **Indexes:** `{ email: 1 }` (unique), `{ role: 1 }`, `{ status: 1 }`, `{ isAdult: 1 }`.

### B. CallSession (`backend/src/models/CallSession.js`)
- **Key Fields:** `sessionId` (UUID), `callerId`, `receiverId`, `callType` (`RANDOM_QUEUE`, `CREATOR_CALL`), `status` (`INITIATED`, `CONNECTING`, `ACTIVE`, `COMPLETED`, `FAILED`), `freePreviewDurationSeconds` (default: 15), `durationSeconds`, `ratePerMinutePaise`, `chargeAmountPaise`, `creatorSharePaise`, `endReason`.
- **Indexes:** `{ sessionId: 1 }` (unique), `{ callerId: 1 }`, `{ receiverId: 1 }`, `{ createdAt: -1 }`.

### C. ChatMessage (`backend/src/models/ChatMessage.js`)
- **Key Fields:** `callSessionId`, `senderId`, `senderName`, `message`, `translation`.
- **Retention TTL Index:** `{ createdAt: 1 }` with `expireAfterSeconds: 86400` (auto-purged after 24 hours for safety & privacy compliance).

### D. UserBlock (`backend/src/models/UserBlock.js`)
- **Key Fields:** `blockerId`, `blockedUserId`, `reason`.
- **Unique Compound Index:** `{ blockerId: 1, blockedUserId: 1 }` (unique).

### E. UserReport (`backend/src/models/UserReport.js`)
- **Key Fields:** `reporterId`, `reportedUserId`, `callSessionId`, `reason` (`INAPPROPRIATE_BEHAVIOR`, `HARASSMENT`, `UNDERAGE_SUSPICION`, `SPAM_SCAM`, `OTHER`), `details`, `status` (`PENDING`, `INVESTIGATING`, `RESOLVED`, `DISMISSED`).

### F. WalletAccount & LedgerEntry (`backend/src/models/WalletAccount.js`, `LedgerEntry.js`)
- **Key Fields in WalletAccount:** `userId`, `balancePaise`, `reservedPaise`, `creatorPayablePaise`, `totalDepositedPaise`, `totalEarnedPaise`.
- **Double-Entry Principle:** Every balance mutation records a corresponding immutable `LedgerEntry` with `type` (`DEPOSIT`, `CALL_RESERVATION`, `CALL_SETTLEMENT`, `CREATOR_SHARE`, `WITHDRAWAL`).

### G. CreatorProfile (`backend/src/models/CreatorProfile.js`)
- **Key Fields:** `userId`, `ratePerMinutePaise`, `isAvailable`, `verificationStatus` (`PENDING`, `APPROVED`, `REJECTED`), `idDocumentType`, `idDocumentNumber`, `bio`, `languages`.

### H. Subscription (`backend/src/models/Subscription.js`)
- **Key Fields:** `userId`, `tier` (`FREE`, `PREMIUM`, `VIP`), `pricePaise`, `status` (`ACTIVE`, `EXPIRED`, `CANCELLED`), `expiresAt`, `razorpayPaymentId`.

### I. PayoutRequest (`backend/src/models/PayoutRequest.js`)
- **Key Fields:** `creatorId`, `amountPaise`, `method` (`UPI`, `BANK_TRANSFER`), `accountDetails`, `status` (`PENDING`, `APPROVED`, `PROCESSED`, `REJECTED`), `processedBy`.
