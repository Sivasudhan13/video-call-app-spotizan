import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { CreatorProfile } from '../src/models/CreatorProfile.js';
import { VerificationRecord } from '../src/models/VerificationRecord.js';
import { generateToken } from '../src/utils/token.js';

describe('Spotizan Phase 3: Creator Profiles, Discovery & KYC Verification API', () => {
  let customerUser, creatorUser, adminUser;
  let customerToken, creatorToken, adminToken;

  beforeAll(async () => {
    await connectDB();
    await User.deleteMany({ email: { $regex: /@creator-test\.com$/ } });
    await CreatorProfile.deleteMany({});
    await VerificationRecord.deleteMany({});

    // Create Customer
    customerUser = await User.create({
      displayName: 'Customer Rahul',
      email: 'rahul@creator-test.com',
      password: 'SecurePassword123!',
      role: 'CUSTOMER',
      dateOfBirth: new Date('2001-05-15'),
      isAdult: true,
      ageAffirmation: { affirmed: true },
    });
    customerToken = generateToken(customerUser);

    // Create Creator
    creatorUser = await User.create({
      displayName: 'Creator Priya',
      email: 'priya@creator-test.com',
      password: 'SecurePassword123!',
      role: 'CREATOR',
      dateOfBirth: new Date('1999-08-20'),
      isAdult: true,
      ageAffirmation: { affirmed: true },
    });
    creatorToken = generateToken(creatorUser);

    // Create Admin
    adminUser = await User.create({
      displayName: 'Admin Officer',
      email: 'admin@creator-test.com',
      password: 'AdminPassword123!',
      role: 'ADMIN',
      dateOfBirth: new Date('1990-01-01'),
      isAdult: true,
      ageAffirmation: { affirmed: true },
    });
    adminToken = generateToken(adminUser);
  });

  afterAll(async () => {
    await User.deleteMany({ email: { $regex: /@creator-test\.com$/ } });
    await CreatorProfile.deleteMany({});
    await VerificationRecord.deleteMany({});
    await disconnectDB();
  });

  it('GET /api/creators/me should FORBID standard CUSTOMER role with 403', async () => {
    const res = await request(app)
      .get('/api/creators/me')
      .set('Cookie', [`spotizan_token=${customerToken}`]);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN_ROLE');
  });

  it('GET /api/creators/me should return initial creator profile for CREATOR role', async () => {
    const res = await request(app)
      .get('/api/creators/me')
      .set('Cookie', [`spotizan_token=${creatorToken}`]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.profile.displayName).toBe('Creator Priya');
    expect(res.body.data.profile.isVerified).toBe(false);
    expect(res.body.data.profile.verificationStatus).toBe('UNSUBMITTED');
    expect(res.body.data.profile.pricePerMinutePaise).toBe(900); // default ₹9/min
  });

  it('PUT /api/creators/me should REJECT rates outside ₹7 to ₹15 boundary', async () => {
    const res = await request(app)
      .put('/api/creators/me')
      .set('Cookie', [`spotizan_token=${creatorToken}`])
      .send({
        pricePerMinutePaise: 400, // ₹4/min is below ₹7 minimum
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('PUT /api/creators/me should update creator profile attributes within boundaries', async () => {
    const res = await request(app)
      .put('/api/creators/me')
      .set('Cookie', [`spotizan_token=${creatorToken}`])
      .send({
        bio: 'Bilingual lifestyle creator and artist. Available for live video calls.',
        languages: ['English', 'Hindi', 'Bengali'],
        interests: ['Art', 'Lifestyle', 'Music'],
        pricePerMinutePaise: 1200, // ₹12/min premium tier
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.profile.pricePerMinutePaise).toBe(1200);
    expect(res.body.data.profile.pricingTier).toBe('PREMIUM');
    expect(res.body.data.profile.languages).toContain('Bengali');
  });

  it('PATCH /api/creators/me/availability should PREVENT going ONLINE prior to KYC approval', async () => {
    const res = await request(app)
      .patch('/api/creators/me/availability')
      .set('Cookie', [`spotizan_token=${creatorToken}`])
      .send({ availabilityStatus: 'ONLINE' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('KYC_UNVERIFIED');
  });

  it('POST /api/creators/apply-verification should submit KYC identity documentation', async () => {
    const res = await request(app)
      .post('/api/creators/apply-verification')
      .set('Cookie', [`spotizan_token=${creatorToken}`])
      .send({
        idType: 'AADHAAR',
        idNumberMasked: 'XXXX-XXXX-8921',
        documentUrl: 'https://spotizan-vault.local/secure-kyc/doc-8921.enc',
        consentAffirmation: true,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.verificationStatus).toBe('PENDING');

    const record = await VerificationRecord.findById(res.body.data.recordId);
    expect(record).not.toBeNull();
    expect(record.status).toBe('PENDING');
    expect(record.idNumberMasked).toBe('XXXX-XXXX-8921');
  });

  it('POST /api/creators/me/kyc should accept KYC submission from customer applying to become creator', async () => {
    const res = await request(app)
      .post('/api/creators/me/kyc')
      .set('Cookie', [`spotizan_token=${customerToken}`])
      .send({
        idType: 'PAN',
        idNumberMasked: 'XXXXX1234X',
        documentUrl: 'https://spotizan-vault.local/secure-kyc/pan-1234.enc',
        consentAffirmation: true,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.verificationStatus).toBe('PENDING');
  });

  let creatorProfileId = '';

  it('GET /api/admin/verification-queue should allow ADMIN to view pending verification applications', async () => {
    const res = await request(app)
      .get('/api/admin/verification-queue')
      .set('Cookie', [`spotizan_token=${adminToken}`]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.queue.length).toBeGreaterThan(0);

    const target = res.body.data.queue.find((item) => item.creator.displayName === 'Creator Priya');
    expect(target).toBeDefined();
    expect(target.latestKycRecord.idNumberMasked).toBe('XXXX-XXXX-8921');
    creatorProfileId = target.creator._id;
  });

  it('PATCH /api/admin/verify-creator/:id should APPROVE creator verification', async () => {
    const res = await request(app)
      .patch(`/api/admin/verify-creator/${creatorProfileId}`)
      .set('Cookie', [`spotizan_token=${adminToken}`])
      .send({ action: 'APPROVE' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.creator.isVerified).toBe(true);
    expect(res.body.data.creator.verificationStatus).toBe('APPROVED');
  });

  it('PATCH /api/creators/me/availability should ALLOW verified creator to switch to ONLINE', async () => {
    const res = await request(app)
      .patch('/api/creators/me/availability')
      .set('Cookie', [`spotizan_token=${creatorToken}`])
      .send({ availabilityStatus: 'ONLINE' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.availabilityStatus).toBe('ONLINE');
  });

  it('GET /api/creators should list verified creators with language & availability filter', async () => {
    const res = await request(app).get('/api/creators?language=Hindi&availabilityStatus=ONLINE');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.creators.length).toBeGreaterThan(0);

    const verifiedCreator = res.body.data.creators.find((c) => c._id === creatorProfileId);
    expect(verifiedCreator).toBeDefined();
    expect(verifiedCreator.isVerified).toBe(true);
    expect(verifiedCreator.availabilityStatus).toBe('ONLINE');
    expect(verifiedCreator.pricePerMinutePaise).toBe(1200);
  });
});
