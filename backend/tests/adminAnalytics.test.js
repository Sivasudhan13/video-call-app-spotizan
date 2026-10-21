import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { generateToken } from '../src/utils/token.js';

describe('Admin Real Data Analytics & User Management Suite', () => {
  let adminUser, regularUser;
  let adminToken, regularToken;

  beforeAll(async () => {
    await connectDB();
    await User.deleteMany({ email: { $regex: /@adminanalytics-test\.com$/ } });
    await AuditLog.deleteMany({});

    adminUser = await User.create({
      displayName: 'System Admin',
      email: 'admin@adminanalytics-test.com',
      password: 'SecurePassword123!',
      role: 'ADMIN',
      dateOfBirth: new Date('1990-01-01'),
      isAdult: true,
      ageAffirmation: { affirmed: true },
    });
    adminToken = generateToken(adminUser);

    regularUser = await User.create({
      displayName: 'Regular Member',
      email: 'regular@adminanalytics-test.com',
      password: 'SecurePassword123!',
      role: 'CUSTOMER',
      gender: 'MALE',
      genderPreference: 'FEMALE',
      dateOfBirth: new Date('1998-05-20'),
      isAdult: true,
      ageAffirmation: { affirmed: true },
    });
    regularToken = generateToken(regularUser);
  });

  afterAll(async () => {
    const { CallSession } = await import('../src/models/CallSession.js');
    await CallSession.deleteMany({ sessionId: { $regex: /^live_test_session_/ } });
    await User.deleteMany({ email: { $regex: /@adminanalytics-test\.com$/ } });
    await AuditLog.deleteMany({});
    await disconnectDB();
  });

  it('GET /api/admin/dashboard/overview: should reject regular customer with 403 Forbidden', async () => {
    const res = await request(app)
      .get('/api/admin/dashboard/overview')
      .set('Cookie', [`spotizan_token=${regularToken}`]);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/admin/dashboard/overview: should return real aggregated counts from database', async () => {
    const res = await request(app)
      .get('/api/admin/dashboard/overview')
      .set('Cookie', [`spotizan_token=${adminToken}`]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalUsers).toBeGreaterThanOrEqual(2);
    expect(res.body.data.verifiedAdultUsers).toBeGreaterThanOrEqual(2);
    expect(res.body.data.grossPaymentVolumeINR).toBeDefined();
    expect(res.body.data.platformRevenueINR).toBeDefined();
    expect(res.body.data.pendingPayoutsINR).toBeDefined();
  });

  it('GET /api/admin/users: should return real paginated users with search support', async () => {
    const res = await request(app)
      .get('/api/admin/users?search=Regular')
      .set('Cookie', [`spotizan_token=${adminToken}`]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.users).toBeInstanceOf(Array);
    expect(res.body.data.users.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.users[0].email).toBe('regular@adminanalytics-test.com');
    expect(res.body.data.users[0].genderPreference).toBe('FEMALE');
  });

  it('PATCH /api/admin/users/:id/status: should update account status and record AuditLog', async () => {
    const res = await request(app)
      .patch(`/api/admin/users/${regularUser._id}/status`)
      .set('Cookie', [`spotizan_token=${adminToken}`])
      .send({ status: 'SUSPENDED', reason: 'Violation of adult terms' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.status).toBe('SUSPENDED');

    // Verify AuditLog creation
    const log = await AuditLog.findOne({ targetId: regularUser._id.toString() });
    expect(log).not.toBeNull();
    expect(log.action).toBe('USER_STATUS_SUSPENDED');
  });

  it('GET /api/admin/audit-logs: should list recorded administrative audit entries', async () => {
    const res = await request(app)
      .get('/api/admin/audit-logs')
      .set('Cookie', [`spotizan_token=${adminToken}`]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.logs).toBeInstanceOf(Array);
    expect(res.body.data.logs.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/admin/active-calls & POST /calls/:sessionId/terminate: should inspect and terminate live call', async () => {
    const { CallSession } = await import('../src/models/CallSession.js');
    const dynamicSessionId = `live_test_session_${Date.now()}`;
    await CallSession.create({
      sessionId: dynamicSessionId,
      callerId: regularUser._id,
      receiverId: adminUser._id,
      status: 'ACTIVE',
      startedAt: new Date(),
      connectedAt: new Date(),
    });

    const getRes = await request(app)
      .get('/api/admin/active-calls')
      .set('Cookie', [`spotizan_token=${adminToken}`]);

    expect(getRes.status).toBe(200);
    expect(getRes.body.success).toBe(true);
    expect(getRes.body.data.activeCalls).toBeInstanceOf(Array);
    expect(getRes.body.data.activeCalls.length).toBeGreaterThanOrEqual(1);

    const termRes = await request(app)
      .post(`/api/admin/calls/${dynamicSessionId}/terminate`)
      .set('Cookie', [`spotizan_token=${adminToken}`])
      .send({ reason: 'SAFETY_VIOLATION', actionType: 'FORCE_DISCONNECT' });

    expect(termRes.status).toBe(200);
    expect(termRes.body.success).toBe(true);
    expect(termRes.body.data.session.status).toBe('COMPLETED');
    expect(termRes.body.data.session.endReason).toBe('SAFETY_TERMINATED');

    const audit = await AuditLog.findOne({ action: 'ADMIN_FORCE_DISCONNECT_CALL' });
    expect(audit).not.toBeNull();
  });
});
