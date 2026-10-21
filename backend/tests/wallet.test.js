import crypto from 'crypto';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { CreatorProfile } from '../src/models/CreatorProfile.js';
import { WalletAccount } from '../src/models/WalletAccount.js';
import { LedgerEntry } from '../src/models/LedgerEntry.js';
import { PayoutRequest } from '../src/models/PayoutRequest.js';
import { CallSession } from '../src/models/CallSession.js';
import { generateToken } from '../src/utils/token.js';
import { env } from '../src/config/env.js';

describe('Spotizan Phase 5: Double-Entry Ledger, Wallet, Razorpay Top-up & Payouts API', () => {
  let customerUser, creatorUser, adminUser;
  let customerToken, creatorToken, adminToken;

  beforeAll(async () => {
    await connectDB();
    const existingUsers = await User.find({ email: { $regex: /@wallet-test\.com$/ } });
    const userIds = existingUsers.map((u) => u._id);
    await WalletAccount.deleteMany({ userId: { $in: userIds } });
    await LedgerEntry.deleteMany({ userId: { $in: userIds } });
    await PayoutRequest.deleteMany({ creatorId: { $in: userIds } });
    await CreatorProfile.deleteMany({ userId: { $in: userIds } });
    await User.deleteMany({ email: { $regex: /@wallet-test\.com$/ } });
    await CallSession.deleteMany({ sessionId: { $regex: /^test_session_/ } });

    // 1. Create Customer User
    customerUser = await User.create({
      displayName: 'Customer Vikram',
      email: 'vikram@wallet-test.com',
      password: 'SecurePassword123!',
      role: 'CUSTOMER',
      dateOfBirth: new Date('1998-06-12'),
      isAdult: true,
      ageAffirmation: { affirmed: true },
    });
    customerToken = generateToken(customerUser);

    // 2. Create Creator User
    creatorUser = await User.create({
      displayName: 'Creator Ananya',
      email: 'ananya@wallet-test.com',
      password: 'SecurePassword123!',
      role: 'CREATOR',
      dateOfBirth: new Date('1996-03-24'),
      isAdult: true,
      ageAffirmation: { affirmed: true },
    });
    creatorToken = generateToken(creatorUser);

    await CreatorProfile.create({
      userId: creatorUser._id,
      displayName: 'Creator Ananya',
      pricePerMinutePaise: 700,
      isVerified: true,
      verificationStatus: 'APPROVED',
      availabilityStatus: 'ONLINE',
    });

    // 3. Create Admin User
    adminUser = await User.create({
      displayName: 'Admin Supervisor',
      email: 'admin@wallet-test.com',
      password: 'AdminPassword123!',
      role: 'ADMIN',
      dateOfBirth: new Date('1988-01-01'),
      isAdult: true,
      ageAffirmation: { affirmed: true },
    });
    adminToken = generateToken(adminUser);
  });

  afterAll(async () => {
    const existingUsers = await User.find({ email: { $regex: /@wallet-test\.com$/ } });
    const userIds = existingUsers.map((u) => u._id);
    await WalletAccount.deleteMany({ userId: { $in: userIds } });
    await LedgerEntry.deleteMany({ userId: { $in: userIds } });
    await PayoutRequest.deleteMany({ creatorId: { $in: userIds } });
    await CreatorProfile.deleteMany({ userId: { $in: userIds } });
    await User.deleteMany({ email: { $regex: /@wallet-test\.com$/ } });
    await CallSession.deleteMany({ sessionId: { $regex: /^test_session_/ } });
    await disconnectDB();
  });

  describe('1. Wallet Initialization & Retrieval', () => {
    it('GET /api/wallet/me should auto-create and return 0 balance wallet for customer', async () => {
      const res = await request(app)
        .get('/api/wallet/me')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.balancePaise).toBe(0);
      expect(res.body.data.reservedPaise).toBe(0);
      expect(res.body.data.creatorPayablePaise).toBe(0);
      expect(res.body.data.currency).toBe('INR');
      expect(res.body.data.isActive).toBe(true);
    });

    it('GET /api/wallet/me should REJECT unauthenticated request with 401', async () => {
      const res = await request(app).get('/api/wallet/me');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('2. Razorpay Wallet Top-up Flow & Idempotent Crediting', () => {
    it('POST /api/wallet/topup/order should REJECT amounts below ₹1 (100 paise)', async () => {
      const res = await request(app)
        .post('/api/wallet/topup/order')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ amountPaise: 50 }); // 50 paise < 100 paise

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('POST /api/wallet/topup/order should create topup order for ₹100 (10,000 paise)', async () => {
      const res = await request(app)
        .post('/api/wallet/topup/order')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ amountPaise: 10000 });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.amountPaise).toBe(10000);
      expect(res.body.data.currency).toBe('INR');
      expect(res.body.data.orderId).toBeDefined();
    });

    it('POST /api/wallet/topup/verify should REJECT invalid HMAC signature with 400', async () => {
      const res = await request(app)
        .post('/api/wallet/topup/verify')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          razorpayOrderId: 'order_test_123',
          razorpayPaymentId: 'pay_test_456',
          razorpaySignature: 'invalid_fraudulent_signature',
          amountPaise: 10000,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('PAYMENT_SIGNATURE_INVALID');
    });

    it('POST /api/wallet/topup/verify should CREDIT wallet and record double-entry ledger upon valid signature', async () => {
      const orderId = 'order_test_valid_001';
      const paymentId = 'pay_test_valid_001';
      const validSignature = crypto
        .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      const res = await request(app)
        .post('/api/wallet/topup/verify')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          razorpayOrderId: orderId,
          razorpayPaymentId: paymentId,
          razorpaySignature: validSignature,
          amountPaise: 10000, // ₹100
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.wallet.balancePaise).toBe(10000);
      expect(res.body.data.isDuplicate).toBe(false);

      // Verify double-entry ledger entries created
      const entries = await LedgerEntry.find({ referenceId: paymentId });
      expect(entries.length).toBe(2);

      const gatewayEntry = entries.find((e) => e.accountType === 'GATEWAY_COLLECTION');
      const liabilityEntry = entries.find((e) => e.accountType === 'CUSTOMER_LIABILITY');

      expect(gatewayEntry).toBeDefined();
      expect(gatewayEntry.entryType).toBe('DEBIT');
      expect(gatewayEntry.amountPaise).toBe(10000);

      expect(liabilityEntry).toBeDefined();
      expect(liabilityEntry.entryType).toBe('CREDIT');
      expect(liabilityEntry.amountPaise).toBe(10000);
    });

    it('POST /api/wallet/topup/verify should be IDEMPOTENT and prevent duplicate crediting for same paymentId', async () => {
      const orderId = 'order_test_valid_001';
      const paymentId = 'pay_test_valid_001';
      const validSignature = crypto
        .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      const res = await request(app)
        .post('/api/wallet/topup/verify')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          razorpayOrderId: orderId,
          razorpayPaymentId: paymentId,
          razorpaySignature: validSignature,
          amountPaise: 10000,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.isDuplicate).toBe(true);

      // Ensure balance was NOT incremented again
      const wallet = await WalletAccount.findOne({ userId: customerUser._id });
      expect(wallet.balancePaise).toBe(10000);
    });
  });

  describe('3. Call Balance Reservation & Billing Settlement', () => {
    const sessionId = 'test_session_billing_001';

    beforeAll(async () => {
      await CallSession.create({
        sessionId,
        callerId: customerUser._id,
        receiverId: creatorUser._id,
        callType: 'RANDOM_QUEUE',
        status: 'CONNECTING',
        startedAt: new Date(),
        connectedAt: new Date(),
        ratePerMinutePaise: 700,
        freePreviewDurationSeconds: 15,
        isFreePreview: true,
      });
    });

    it('POST /api/wallet/reserve-call should REJECT when balance is insufficient', async () => {
      const res = await request(app)
        .post('/api/wallet/reserve-call')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          callSessionId: sessionId,
          estimatedMinutes: 20, // 20 * 700 = 14,000 paise > 10,000 available
          ratePerMinutePaise: 700,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INSUFFICIENT_FUNDS');
    });

    it('POST /api/wallet/reserve-call should LOCK funds in reservedPaise when balance is sufficient', async () => {
      const res = await request(app)
        .post('/api/wallet/reserve-call')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          callSessionId: sessionId,
          estimatedMinutes: 5, // 5 * 700 = 3500 paise
          ratePerMinutePaise: 700,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.reservedPaise).toBe(3500);
      expect(res.body.data.wallet.balancePaise).toBe(6500); // 10000 - 3500
      expect(res.body.data.wallet.reservedPaise).toBe(3500);
    });

    it('POST /api/wallet/settle-call: FREE PREVIEW guarantee (duration <= 15s should bill ₹0 and release all reserved funds)', async () => {
      const previewSessionId = 'test_session_free_preview_002';
      await CallSession.create({
        sessionId: previewSessionId,
        callerId: customerUser._id,
        receiverId: creatorUser._id,
        status: 'ACTIVE',
        ratePerMinutePaise: 700,
      });

      // Settle a call of 12 seconds
      const res = await request(app)
        .post('/api/wallet/settle-call')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          callSessionId: previewSessionId,
          durationSeconds: 12,
          ratePerMinutePaise: 700,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.totalChargePaise).toBe(0);
      expect(res.body.data.billableMinutes).toBe(0);
      expect(res.body.data.creatorSharePaise).toBe(0);
      expect(res.body.data.platformSharePaise).toBe(0);
      // Customer's 3500 reservation should be completely returned
      expect(res.body.data.callerWallet.balancePaise).toBe(10000);
      expect(res.body.data.callerWallet.reservedPaise).toBe(0);
    });

    it('POST /api/wallet/settle-call: Paid call (75 seconds = 15s free + 60s billable = 1 minute at ₹7/min) with 70/30 split', async () => {
      // Re-reserve 5 mins (3500 paise) for sessionId
      await request(app)
        .post('/api/wallet/reserve-call')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          callSessionId: sessionId,
          estimatedMinutes: 5,
          ratePerMinutePaise: 700,
        });

      const res = await request(app)
        .post('/api/wallet/settle-call')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          callSessionId: sessionId,
          durationSeconds: 75, // 75 - 15 = 60s -> 1 minute billable
          ratePerMinutePaise: 700,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.billableMinutes).toBe(1);
      expect(res.body.data.totalChargePaise).toBe(700); // ₹7 charged
      expect(res.body.data.creatorSharePaise).toBe(490); // 70% of ₹7 = ₹4.90 (490 paise)
      expect(res.body.data.platformSharePaise).toBe(210); // 30% of ₹7 = ₹2.10 (210 paise)
      expect(res.body.data.releasedReservationPaise).toBe(2800); // 3500 - 700 = 2800 refunded

      // Verify creator wallet earned 490 paise
      expect(res.body.data.creatorWallet.creatorPayablePaise).toBe(490);

      // Verify caller balance: 6500 + 2800 released = 9300 paise
      expect(res.body.data.callerWallet.balancePaise).toBe(9300);
      expect(res.body.data.callerWallet.reservedPaise).toBe(0);
    });

    it('POST /api/wallet/settle-call: Random queue call with 0 reserved funds directly deducts from balance and credits creator 70%', async () => {
      const randomCallSessionId = `rand_sess_${Date.now()}`;
      await CallSession.create({
        sessionId: randomCallSessionId,
        callerId: customerUser._id,
        receiverId: creatorUser._id,
        status: 'ACTIVE',
        ratePerMinutePaise: 700,
      });

      // Customer currently has 9300 paise balance and 0 reserved
      const res = await request(app)
        .post('/api/wallet/settle-call')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          callSessionId: randomCallSessionId,
          durationSeconds: 75, // 1 minute billable (₹7.00)
          ratePerMinutePaise: 700,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.totalChargePaise).toBe(700);
      expect(res.body.data.creatorSharePaise).toBe(490);
      // Customer balance should be 9300 - 700 = 8600
      expect(res.body.data.callerWallet.balancePaise).toBe(8600);
      expect(res.body.data.callerWallet.reservedPaise).toBe(0);
      // Creator earned another 490 (490 + 490 = 980)
      expect(res.body.data.creatorWallet.creatorPayablePaise).toBe(980);

      // Reset wallets so downstream tests maintain expected state
      await WalletAccount.findOneAndUpdate(
        { userId: creatorUser._id },
        { $set: { creatorPayablePaise: 490 } }
      );
      await WalletAccount.findOneAndUpdate(
        { userId: customerUser._id },
        { $set: { balancePaise: 9300 } }
      );
    });
  });

  describe('4. Creator Payouts & Admin Processing', () => {
    let createdPayoutId;

    it('POST /api/wallet/payout/request should REJECT customer role with 403', async () => {
      const res = await request(app)
        .post('/api/wallet/payout/request')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          amountPaise: 50000,
          method: 'UPI',
          details: { upiId: 'customer@upi' },
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/wallet/payout/request should REJECT amount below minimum ₹500 (50,000 paise)', async () => {
      const res = await request(app)
        .post('/api/wallet/payout/request')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          amountPaise: 20000, // ₹200
          method: 'UPI',
          details: { upiId: 'creator@upi' },
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('POST /api/wallet/payout/request should REJECT when creator has insufficient earnings', async () => {
      const res = await request(app)
        .post('/api/wallet/payout/request')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          amountPaise: 50000, // ₹500
          method: 'UPI',
          details: { upiId: 'ananya@okaxis' },
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INSUFFICIENT_EARNINGS');
    });

    it('POST /api/wallet/payout/request should DEDUCT payable balance and create PENDING payout when eligible', async () => {
      // Simulate creator accumulating ₹600 (60,000 paise)
      await WalletAccount.findOneAndUpdate(
        { userId: creatorUser._id },
        { $inc: { creatorPayablePaise: 60000 } }
      );

      const res = await request(app)
        .post('/api/wallet/payout/request')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          amountPaise: 50000, // ₹500
          method: 'UPI',
          details: { upiId: 'ananya@okhdfcbank' },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.payout.status).toBe('PENDING');
      expect(res.body.data.payout.amountPaise).toBe(50000);
      expect(res.body.data.wallet.creatorPayablePaise).toBe(10490); // 60490 - 50000

      createdPayoutId = res.body.data.payout.payoutId;
    });

    it('GET /api/admin/payouts should allow ADMIN to list pending payouts', async () => {
      const res = await request(app)
        .get('/api/admin/payouts?status=PENDING')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.payouts.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.payouts[0].payoutId).toBe(createdPayoutId);
    });

    it('PATCH /api/admin/payouts/:payoutId should APPROVE and mark payout PROCESSED', async () => {
      const res = await request(app)
        .patch(`/api/admin/payouts/${createdPayoutId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'PROCESSED',
          transactionReference: 'UPI_REF_BANK_9876543210',
          adminNotes: 'Disbursed via direct UPI payout gateway',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('PROCESSED');
      expect(res.body.data.transactionReference).toBe('UPI_REF_BANK_9876543210');
      expect(res.body.data.processedAt).toBeDefined();
    });

    it('PATCH /api/admin/payouts/:payoutId should REFUND creator payable earnings if REJECTED', async () => {
      // Create another payout of ₹500
      const payoutRes = await request(app)
        .post('/api/wallet/payout/request')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          amountPaise: 50000,
          method: 'BANK_TRANSFER',
          details: {
            bankAccountNumber: '987654321012',
            ifscCode: 'HDFC0001234',
            accountHolderName: 'Ananya Sharma',
          },
        });

      // Wallet initially had 10490, after ₹500 deduction it becomes 10490 - 50000... wait, let's credit ₹500 first
      await WalletAccount.findOneAndUpdate(
        { userId: creatorUser._id },
        { $inc: { creatorPayablePaise: 50000 } }
      );

      const secondPayoutRes = await request(app)
        .post('/api/wallet/payout/request')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          amountPaise: 50000,
          method: 'BANK_TRANSFER',
          details: {
            bankAccountNumber: '987654321012',
            ifscCode: 'HDFC0001234',
            accountHolderName: 'Ananya Sharma',
          },
        });

      const secondPayoutId = secondPayoutRes.body.data.payout.payoutId;

      // Admin REJECTS payout due to wrong IFSC code
      const rejectRes = await request(app)
        .patch(`/api/admin/payouts/${secondPayoutId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'REJECTED',
          adminNotes: 'Invalid IFSC branch code provided',
        });

      expect(rejectRes.status).toBe(200);
      expect(rejectRes.body.data.status).toBe('REJECTED');

      // Check creator payable balance was restored
      const creatorWallet = await WalletAccount.findOne({ userId: creatorUser._id });
      expect(creatorWallet.creatorPayablePaise).toBeGreaterThanOrEqual(50000);
    });
  });

  describe('5. Ledger Audit Trail & Creator Earnings Summary', () => {
    it('GET /api/wallet/ledger should return paginated audit trail for customer', async () => {
      const res = await request(app)
        .get('/api/wallet/ledger?limit=10')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.entries.length).toBeGreaterThan(0);
      expect(res.body.data.totalCount).toBeGreaterThan(0);

      const firstEntry = res.body.data.entries[0];
      expect(firstEntry.currency).toBe('INR');
      expect(firstEntry.idempotencyKey).toBeDefined();
    });

    it('GET /api/wallet/creator-earnings should return complete financial summary for creator', async () => {
      const res = await request(app)
        .get('/api/wallet/creator-earnings')
        .set('Authorization', `Bearer ${creatorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.currency).toBe('INR');
      expect(res.body.data.lifetimeEarnedPaise).toBeGreaterThanOrEqual(490);
      expect(res.body.data.totalWithdrawnPaise).toBe(50000);
      expect(res.body.data.availablePayablePaise).toBeDefined();
    });
  });
});
