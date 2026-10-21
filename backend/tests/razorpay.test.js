import crypto from 'crypto';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { WalletAccount } from '../src/models/WalletAccount.js';
import { LedgerEntry } from '../src/models/LedgerEntry.js';
import { generateToken } from '../src/utils/token.js';
import { env } from '../src/config/env.js';

describe('Razorpay Standard Web Checkout API Suite', () => {
  let testUser, userToken;

  beforeAll(async () => {
    await connectDB();
    const existingUsers = await User.find({ email: { $regex: /@razorpay-suite\.com$/ } });
    const userIds = existingUsers.map((u) => u._id);
    await WalletAccount.deleteMany({ userId: { $in: userIds } });
    await LedgerEntry.deleteMany({ userId: { $in: userIds } });
    await User.deleteMany({ email: { $regex: /@razorpay-suite\.com$/ } });

    testUser = await User.create({
      displayName: 'Razorpay Test User',
      email: 'test@razorpay-suite.com',
      password: 'SecurePassword123!',
      role: 'CUSTOMER',
      dateOfBirth: new Date('1999-01-01'),
      isAdult: true,
      ageAffirmation: { affirmed: true },
    });
    userToken = generateToken(testUser);
  });

  afterAll(async () => {
    const existingUsers = await User.find({ email: { $regex: /@razorpay-suite\.com$/ } });
    const userIds = existingUsers.map((u) => u._id);
    await WalletAccount.deleteMany({ userId: { $in: userIds } });
    await LedgerEntry.deleteMany({ userId: { $in: userIds } });
    await User.deleteMany({ email: { $regex: /@razorpay-suite\.com$/ } });
    await disconnectDB();
  });

  describe('STEP 1: POST /api/create-order', () => {
    it('should reject order creation if amount is missing or less than 100 paise', async () => {
      const res = await request(app)
        .post('/api/create-order')
        .send({ amount: 50 }); // 50 paise is < 100 paise

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/minimum/i);
    });

    it('should successfully create a Razorpay order with valid amount (>= 100 paise)', async () => {
      const res = await request(app)
        .post('/api/create-order')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          amount: 50000, // ₹500 in paise
          currency: 'INR',
          receipt: 'test_rcpt_suite_1',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.order_id).toBeDefined();
      expect(res.body.order_id).toMatch(/^order_/);
      expect(res.body.amount).toBe(50000);
      expect(res.body.currency).toBe('INR');
      expect(res.body.key_id).toBe(env.RAZORPAY_KEY_ID);
    }, 15000);

    it('should successfully create a ₹1 (100 paise) test payment order', async () => {
      const res = await request(app)
        .post('/api/create-order')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          amount: 100, // 100 paise = ₹1.00
          currency: 'INR',
          receipt: 'test_1rs_rcpt',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.order_id).toBeDefined();
      expect(res.body.amount).toBe(100);
      expect(res.body.currency).toBe('INR');
    });
  });

  describe('STEP 3: POST /api/verify-payment', () => {
    it('should reject payment verification if required fields are missing', async () => {
      const res = await request(app)
        .post('/api/verify-payment')
        .send({
          order_id: 'order_test_123',
          // payment_id and signature missing
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/missing/i);
    });

    it('should reject payment verification if signature does not match (tampered/fake)', async () => {
      const orderId = 'order_valid_123';
      const paymentId = 'pay_valid_456';
      const fakeSignature = 'tampered_signature_invalid_hex_string_1234567890';

      const res = await request(app)
        .post('/api/verify-payment')
        .send({
          order_id: orderId,
          payment_id: paymentId,
          signature: fakeSignature,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.isPaid).toBe(false);
      expect(res.body.error).toMatch(/signature/i);
    });

    it('should verify payment successfully when valid HMAC-SHA256 signature is provided', async () => {
      const orderId = 'order_test_suite_order_999';
      const paymentId = 'pay_test_suite_pay_888';

      // Compute authoritative HMAC-SHA256 signature using the configured RAZORPAY_KEY_SECRET
      const validSignature = crypto
        .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      const res = await request(app)
        .post('/api/verify-payment')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          order_id: orderId,
          payment_id: paymentId,
          signature: validSignature,
          amount: 25000,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.isPaid).toBe(true);
      expect(res.body.order_id).toBe(orderId);
      expect(res.body.payment_id).toBe(paymentId);
    });

    it('should successfully verify and credit ₹1.00 (100 paise) top-up to user wallet', async () => {
      const orderId = 'order_1rs_test_order';
      const paymentId = 'pay_1rs_test_pay';

      const validSignature = crypto
        .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      const res = await request(app)
        .post('/api/verify-payment')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          order_id: orderId,
          payment_id: paymentId,
          signature: validSignature,
          amount: 100, // 100 paise = ₹1.00
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.isPaid).toBe(true);
      expect(res.body.wallet).toBeDefined();
    });
  });
});
