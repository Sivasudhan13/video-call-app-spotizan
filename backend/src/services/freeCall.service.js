import { User } from '../models/User.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../middlewares/errorHandler.js';

// Initial configurable defaults as specified in Section 5
export const FREE_CALL_CONFIG = {
  COOLDOWN_HOURS: 6,
  DURATION_SECONDS: 120, // 2 minutes
  RESERVATION_TTL_MINUTES: 5,
};

export class FreeCallService {
  /**
   * Check user's free call eligibility and calculate next eligible timestamp in UTC.
   */
  static async getFreeCallStatus(userId) {
    const user = await User.findById(userId).select('lastFreeCallAt freeCallReservedUntil');
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    const now = new Date();
    const cooldownMs = FREE_CALL_CONFIG.COOLDOWN_HOURS * 60 * 60 * 1000;

    let isEligible = true;
    let nextEligibleAt = null;
    let remainingSeconds = 0;

    if (user.lastFreeCallAt) {
      const elapsedMs = now.getTime() - new Date(user.lastFreeCallAt).getTime();
      if (elapsedMs < cooldownMs) {
        isEligible = false;
        nextEligibleAt = new Date(new Date(user.lastFreeCallAt).getTime() + cooldownMs);
        remainingSeconds = Math.ceil((nextEligibleAt.getTime() - now.getTime()) / 1000);
      }
    }

    // Check if there is an active valid reservation
    const isReserved =
      user.freeCallReservedUntil && new Date(user.freeCallReservedUntil).getTime() > now.getTime();

    return {
      eligible: isEligible && !isReserved,
      isCurrentlyReserved: Boolean(isReserved),
      cooldownHours: FREE_CALL_CONFIG.COOLDOWN_HOURS,
      maxDurationSeconds: FREE_CALL_CONFIG.DURATION_SECONDS,
      lastFreeCallAt: user.lastFreeCallAt || null,
      nextEligibleAt: nextEligibleAt ? nextEligibleAt.toISOString() : null,
      remainingSeconds: Math.max(0, remainingSeconds),
    };
  }

  /**
   * Atomically reserve a free call claim for 5 minutes prior to matching.
   */
  static async reserveFreeCall(userId) {
    const now = new Date();
    const cooldownMs = FREE_CALL_CONFIG.COOLDOWN_HOURS * 60 * 60 * 1000;
    const cooldownBoundary = new Date(now.getTime() - cooldownMs);
    const reservationExpiry = new Date(now.getTime() + FREE_CALL_CONFIG.RESERVATION_TTL_MINUTES * 60 * 1000);

    // Atomic update: only succeeds if lastFreeCallAt is either null or older than 6 hours,
    // and no active unexpired reservation exists
    const updatedUser = await User.findOneAndUpdate(
      {
        _id: userId,
        $or: [
          { lastFreeCallAt: null },
          { lastFreeCallAt: { $lte: cooldownBoundary } },
        ],
        $and: [
          {
            $or: [
              { freeCallReservedUntil: null },
              { freeCallReservedUntil: { $lte: now } },
            ],
          },
        ],
      },
      {
        $set: { freeCallReservedUntil: reservationExpiry },
      },
      { new: true }
    );

    if (!updatedUser) {
      const status = await this.getFreeCallStatus(userId);
      throw new AppError(
        `Free call not available. Cooldown in progress until ${status.nextEligibleAt || 'later'}.`,
        400,
        'FREE_CALL_COOLDOWN'
      );
    }

    logger.info(`Free call reserved for user ${userId} until ${reservationExpiry.toISOString()}`);
    return {
      success: true,
      reservedUntil: reservationExpiry.toISOString(),
      maxDurationSeconds: FREE_CALL_CONFIG.DURATION_SECONDS,
    };
  }

  /**
   * Consume the free call claim upon valid WebRTC connection.
   */
  static async consumeFreeCall(userId) {
    const now = new Date();
    await User.findByIdAndUpdate(userId, {
      $set: {
        lastFreeCallAt: now,
        freeCallReservedUntil: null,
      },
    });
    logger.info(`Free call consumed by user ${userId} at ${now.toISOString()}`);
    return { success: true, consumedAt: now.toISOString() };
  }

  /**
   * Release reservation if connection failed or user aborted before connecting.
   */
  static async releaseReservation(userId) {
    await User.findByIdAndUpdate(userId, {
      $set: { freeCallReservedUntil: null },
    });
    logger.info(`Free call reservation released for user ${userId}`);
    return { success: true };
  }
}
