import { User } from '../models/User.js';
import { logger } from '../utils/logger.js';

export async function ensureAdminExists() {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@spotizan.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@Spotizan123!';

    const existingAdmin = await User.findOne({ email: adminEmail });
    if (!existingAdmin) {
      await User.create({
        displayName: 'Platform Administrator',
        email: adminEmail,
        password: adminPassword,
        role: 'ADMIN',
        gender: 'OTHER',
        dateOfBirth: new Date('1990-01-01'),
        isAdult: true,
        ageAffirmation: {
          affirmed: true,
          affirmedAt: new Date(),
          ipAddress: '127.0.0.1',
          userAgent: 'System Seed',
        },
        status: 'ACTIVE',
      });
      logger.info(`Default Admin account initialized: ${adminEmail}`);
    }
  } catch (err) {
    logger.warn('Admin account check:', { error: err.message });
  }
}
