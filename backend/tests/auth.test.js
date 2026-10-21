import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { VerificationRecord } from '../src/models/VerificationRecord.js';

describe('Spotizan Authentication & 18+ Age Eligibility API', () => {
  beforeAll(async () => {
    await connectDB();
    await User.deleteMany({ email: { $regex: /@test-spotizan\.com$/ } });
    await VerificationRecord.deleteMany({});
  });

  afterAll(async () => {
    await User.deleteMany({ email: { $regex: /@test-spotizan\.com$/ } });
    await VerificationRecord.deleteMany({});
    await disconnectDB();
  });

  const validAdultDOB = '2000-01-15'; // 26 years old
  const underageDOB = '2012-05-20'; // 14 years old

  it('POST /api/auth/register should REJECT underage users with 403 Forbidden', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        displayName: 'Underage User',
        email: 'underage@test-spotizan.com',
        password: 'Password123!',
        dateOfBirth: underageDOB,
        ageAffirmation: true,
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('AGE_RESTRICTION_ERROR');
    expect(res.body.error.message).toContain('Underage Registration Prohibited');
  });

  it('POST /api/auth/register should REJECT missing statutory age affirmation', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        displayName: 'No Affirmation',
        email: 'noaffirm@test-spotizan.com',
        password: 'Password123!',
        dateOfBirth: validAdultDOB,
        ageAffirmation: false,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /api/auth/register should REGISTER eligible 18+ adult and set HTTP-only cookie', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        displayName: 'Aarav Sharma',
        email: 'aarav@test-spotizan.com',
        password: 'SecurePassword123!',
        role: 'CUSTOMER',
        dateOfBirth: validAdultDOB,
        ageAffirmation: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('aarav@test-spotizan.com');
    expect(res.body.data.user.isAdult).toBe(true);
    expect(res.body.data.user.password).toBeUndefined();

    // Check Set-Cookie header contains spotizan_token
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies.some((c) => c.includes('spotizan_token'))).toBe(true);

    // Verify statutory audit record exists
    const record = await VerificationRecord.findOne({ userId: res.body.data.user._id });
    expect(record).not.toBeNull();
    expect(record.status).toBe('APPROVED');
    expect(record.verifiedAgeYears).toBeGreaterThanOrEqual(18);
  });

  it('POST /api/auth/register should PREVENT duplicate email registrations', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        displayName: 'Duplicate User',
        email: 'aarav@test-spotizan.com',
        password: 'SecurePassword123!',
        dateOfBirth: validAdultDOB,
        ageAffirmation: true,
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('DUPLICATE_EMAIL');
  });

  it('POST /api/auth/login should REJECT incorrect passwords with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'aarav@test-spotizan.com',
        password: 'WrongPassword!',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  let authCookie = '';

  it('POST /api/auth/login should AUTHENTICATE adult user with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'aarav@test-spotizan.com',
        password: 'SecurePassword123!',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('aarav@test-spotizan.com');

    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    authCookie = cookies.find((c) => c.startsWith('spotizan_token='));
  });

  it('GET /api/auth/me should RETURN authenticated profile using session cookie', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', [authCookie]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.displayName).toBe('Aarav Sharma');
    expect(res.body.data.user.isAdult).toBe(true);
  });

  it('GET /api/auth/admin-check should FORBID standard CUSTOMER role with 403', async () => {
    const res = await request(app)
      .get('/api/auth/admin-check')
      .set('Cookie', [authCookie]);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN_ROLE');
  });

  it('POST /api/auth/register should ENFORCE that female users (girls) only receive the CREATOR role', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        displayName: 'Riya Girl',
        email: 'riya@test-spotizan.com',
        password: 'SecurePassword123!',
        gender: 'FEMALE',
        role: 'CUSTOMER', // Attempting to register as customer
        dateOfBirth: validAdultDOB,
        ageAffirmation: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.gender).toBe('FEMALE');
    expect(res.body.data.user.role).toBe('CREATOR'); // Strictly enforced as CREATOR
  });

  it('POST /api/auth/login should guarantee girls login strictly with the CREATOR role', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'riya@test-spotizan.com',
        password: 'SecurePassword123!',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.gender).toBe('FEMALE');
    expect(res.body.data.user.role).toBe('CREATOR');
  });

  it('POST /api/auth/logout should CLEAR authentication cookie', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const cookies = res.headers['set-cookie'];
    expect(cookies.some((c) => c.includes('spotizan_token=;'))).toBe(true);
  });
});
