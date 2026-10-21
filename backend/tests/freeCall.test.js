import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { CallSession } from '../src/models/CallSession.js';
import { generateToken } from '../src/utils/token.js';
import { FreeCallService, FREE_CALL_CONFIG } from '../src/services/freeCall.service.js';
import { WalletService } from '../src/services/wallet.service.js';

describe('Togilo-Inspired Free Call Rules & Cooldown API Suite', () => {
  let testUser, partnerUser;
  let authToken;

  beforeAll(async () => {
    await connectDB();
    await User.deleteMany({ email: { $regex: /@freecall-test\.com$/ } });
    await CallSession.deleteMany({ sessionId: { $regex: /^test_freecall_/ } });

    testUser = await User.create({
      displayName: 'Test Free Caller',
      email: 'user@freecall-test.com',
      password: 'SecurePassword123!',
      role: 'CUSTOMER',
      dateOfBirth: new Date('1999-01-01'),
      isAdult: true,
      ageAffirmation: { affirmed: true },
    });
    authToken = generateToken(testUser);

    partnerUser = await User.create({
      displayName: 'Partner User',
      email: 'partner@freecall-test.com',
      password: 'SecurePassword123!',
      role: 'CREATOR',
      dateOfBirth: new Date('1998-05-15'),
      isAdult: true,
      ageAffirmation: { affirmed: true },
    });
  });

  afterAll(async () => {
    await User.deleteMany({ email: { $regex: /@freecall-test\.com$/ } });
    await CallSession.deleteMany({ sessionId: { $regex: /^test_freecall_/ } });
    await disconnectDB();
  });

  it('GET /api/calls/free-call/status: should report eligible: true for new users with no prior free calls', async () => {
    const res = await request(app)
      .get('/api/calls/free-call/status')
      .set('Cookie', [`spotizan_token=${authToken}`]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.eligible).toBe(true);
    expect(res.body.data.cooldownHours).toBe(6);
    expect(res.body.data.maxDurationSeconds).toBe(120);
    expect(res.body.data.remainingSeconds).toBe(0);
  });

  it('POST /api/calls/free-call/claim: should atomically reserve free call slot', async () => {
    const res = await request(app)
      .post('/api/calls/free-call/claim')
      .set('Cookie', [`spotizan_token=${authToken}`]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.reservedUntil).toBeDefined();
    expect(res.body.data.maxDurationSeconds).toBe(120);

    // Verify DB update
    const updated = await User.findById(testUser._id);
    expect(updated.freeCallReservedUntil).not.toBeNull();
  });

  it('FreeCallService.consumeFreeCall: should consume allowance and enforce 6-hour cooldown', async () => {
    await FreeCallService.consumeFreeCall(testUser._id);

    const statusRes = await request(app)
      .get('/api/calls/free-call/status')
      .set('Cookie', [`spotizan_token=${authToken}`]);

    expect(statusRes.status).toBe(200);
    expect(statusRes.body.data.eligible).toBe(false);
    expect(statusRes.body.data.remainingSeconds).toBeGreaterThan(0);
    expect(statusRes.body.data.nextEligibleAt).toBeDefined();

    // Attempting to claim again while on cooldown should fail
    const claimRes = await request(app)
      .post('/api/calls/free-call/claim')
      .set('Cookie', [`spotizan_token=${authToken}`]);

    expect(claimRes.status).toBe(400);
    expect(claimRes.body.error.code).toBe('FREE_CALL_COOLDOWN');
  });

  it('WalletService.settleCallSession: should bill ₹0 and deduct 0 paise for isFreeCall: true', async () => {
    const sessionId = `test_freecall_${Date.now()}`;
    await CallSession.create({
      sessionId,
      callerId: testUser._id,
      receiverId: partnerUser._id,
      callType: 'RANDOM_QUEUE',
      status: 'ACTIVE',
      isFreeCall: true,
      maxFreeCallDurationSeconds: 120,
      durationSeconds: 110, // 1m 50s call
      ratePerMinutePaise: 0,
    });

    const settlement = await WalletService.settleCallSession({
      callSessionId: sessionId,
      durationSeconds: 110,
      ratePerMinutePaise: 0,
      freePreviewSeconds: 0,
    });

    expect(settlement.success).toBe(true);
    expect(settlement.totalChargePaise).toBe(0);
    expect(settlement.creatorSharePaise).toBe(0);
    expect(settlement.platformSharePaise).toBe(0);
  });
});
