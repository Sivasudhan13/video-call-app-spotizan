import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User.js';
import { CreatorProfile } from '../models/CreatorProfile.js';
import { VerificationRecord } from '../models/VerificationRecord.js';
import { CallSession } from '../models/CallSession.js';
import { LedgerEntry } from '../models/LedgerEntry.js';
import { WalletAccount } from '../models/WalletAccount.js';
import { logger } from '../utils/logger.js';
import { ensureAdminExists } from './seedAdmin.js';

dotenv.config();

/**
 * Development database seeder.
 * STRICT SAFETY RULE: Never mix seed data into production.
 */
async function seedDevDatabase() {
  if (process.env.NODE_ENV === 'production') {
    console.error('FATAL ERROR: Seed scripts are strictly prohibited in production environment.');
    process.exit(1);
  }

  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/spotizan_dev';
  logger.info(`Connecting to development database: ${mongoUri}`);

  await mongoose.connect(mongoUri);

  try {
    // 1. Ensure admin account exists
    await ensureAdminExists();

    // 2. Seed verified creator test accounts
    const creatorsData = [
      {
        displayName: 'Priya Sharma (Test)',
        email: 'priya.test@spotizan.com',
        password: 'Password123!',
        gender: 'FEMALE',
        genderPreference: 'ANY',
        role: 'CREATOR',
        dateOfBirth: new Date('1998-05-14'),
        price: 900, // ₹9/min
        bio: 'Bilingual lifestyle creator and artist. Fluent in English and Hindi.',
        languages: ['English', 'Hindi'],
      },
      {
        displayName: 'Neha Kapoor (Test)',
        email: 'neha.test@spotizan.com',
        password: 'Password123!',
        gender: 'FEMALE',
        genderPreference: 'MALE',
        role: 'CREATOR',
        dateOfBirth: new Date('1996-09-22'),
        price: 1200, // ₹12/min
        bio: 'Conversationalist & digital storyteller. Let us chat about music, films and life.',
        languages: ['English', 'Hindi', 'Punjabi'],
      },
    ];

    for (const c of creatorsData) {
      let user = await User.findOne({ email: c.email });
      if (!user) {
        user = await User.create({
          displayName: c.displayName,
          email: c.email,
          password: c.password,
          gender: c.gender,
          genderPreference: c.genderPreference,
          role: c.role,
          dateOfBirth: c.dateOfBirth,
          isAdult: true,
          bio: c.bio,
          languages: c.languages,
          ageAffirmation: {
            affirmed: true,
            affirmedAt: new Date(),
            ipAddress: '127.0.0.1',
            userAgent: 'Dev Seeder',
          },
          status: 'ACTIVE',
        });
      }

      await CreatorProfile.findOneAndUpdate(
        { userId: user._id },
        {
          userId: user._id,
          displayName: user.displayName,
          bio: c.bio,
          pricePerMinutePaise: c.price,
          pricingTier: 'STANDARD',
          verificationStatus: 'APPROVED',
          isVerified: true,
          availabilityStatus: 'ONLINE',
          languages: c.languages,
        },
        { upsert: true, new: true }
      );

      const existingRecord = await VerificationRecord.findOne({ userId: user._id });
      if (!existingRecord) {
        await VerificationRecord.create({
          userId: user._id,
          verificationType: 'AGE_STATUTORY_DECLARATION',
          status: 'APPROVED',
          idType: 'PASSPORT',
          declaredDateOfBirth: c.dateOfBirth,
          verifiedAgeYears: 26,
          legalDeclarationText:
            'I certify under penalty of perjury that I am at least 18 years of age and legally permitted to access adult services in my jurisdiction.',
          ipAddress: '127.0.0.1',
          userAgent: 'Dev Seeder',
        });
      }

      logger.info(`Seeded creator: ${c.email}`);
    }

    // 3. Seed member/caller test accounts
    const customersData = [
      {
        displayName: 'Aarav Kumar (Test)',
        email: 'aarav.test@spotizan.com',
        password: 'Password123!',
        gender: 'MALE',
        genderPreference: 'FEMALE',
        role: 'CUSTOMER',
        dateOfBirth: new Date('1995-02-18'),
        bio: 'Tech enthusiast and avid reader.',
        languages: ['English', 'Hindi'],
      },
      {
        displayName: 'Rohit Verma (Test)',
        email: 'rohit.test@spotizan.com',
        password: 'Password123!',
        gender: 'MALE',
        genderPreference: 'ANY',
        role: 'CUSTOMER',
        dateOfBirth: new Date('1997-11-04'),
        bio: 'Filmmaker and traveler.',
        languages: ['English', 'Hindi'],
      },
    ];

    for (const u of customersData) {
      let user = await User.findOne({ email: u.email });
      if (!user) {
        user = await User.create({
          displayName: u.displayName,
          email: u.email,
          password: u.password,
          gender: u.gender,
          genderPreference: u.genderPreference,
          role: u.role,
          dateOfBirth: u.dateOfBirth,
          isAdult: true,
          bio: u.bio,
          languages: u.languages,
          ageAffirmation: {
            affirmed: true,
            affirmedAt: new Date(),
            ipAddress: '127.0.0.1',
            userAgent: 'Dev Seeder',
          },
          status: 'ACTIVE',
        });

        const wallet = await WalletAccount.findOneAndUpdate(
          { userId: user._id },
          { $set: { balancePaise: 50000, isActive: true } },
          { upsert: true, new: true }
        );

        await LedgerEntry.create({
          entryId: `seed_tx_${user._id}`,
          userId: user._id,
          accountType: 'CUSTOMER_LIABILITY',
          entryType: 'CREDIT',
          amountPaise: 50000,
          currency: 'INR',
          referenceType: 'TOPUP',
          referenceId: `seed_ref_${user._id}`,
          idempotencyKey: `seed_idemp_${user._id}`,
          balanceAfterPaise: 50000,
          description: 'Development initial test wallet balance (₹500)',
        });

        logger.info(`Seeded customer: ${u.email}`);
      }
    }

    logger.info('Development seeding finished successfully.');
  } catch (err) {
    logger.error('Seeding failed:', { error: err.message });
  } finally {
    await mongoose.disconnect();
  }
}

seedDevDatabase();
