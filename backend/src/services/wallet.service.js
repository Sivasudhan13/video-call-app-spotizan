import crypto from 'crypto';
import Razorpay from 'razorpay';
import { WalletAccount } from '../models/WalletAccount.js';
import { LedgerEntry } from '../models/LedgerEntry.js';
import { PayoutRequest } from '../models/PayoutRequest.js';
import { CallSession } from '../models/CallSession.js';
import { CreatorProfile } from '../models/CreatorProfile.js';
import { User } from '../models/User.js';
import { AppError } from '../middlewares/errorHandler.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

let razorpayClient = null;
try {
  razorpayClient = new Razorpay({
    key_id: env.RAZORPAY_KEY_ID,
    key_secret: env.RAZORPAY_KEY_SECRET,
  });
} catch (err) {
  logger.warn('Failed to initialize Razorpay SDK client:', { error: err.message });
}

const isRealRazorpayConfigured = () => {
  return (
    !!env.RAZORPAY_KEY_ID &&
    !!env.RAZORPAY_KEY_SECRET &&
    !env.RAZORPAY_KEY_ID.includes('spotizan_key_123') &&
    env.RAZORPAY_KEY_ID.startsWith('rzp_')
  );
};

export class WalletService {
  /**
   * Retrieves or lazily creates a WalletAccount for a user.
   */
  static async getOrCreateWallet(userId) {
    let wallet = await WalletAccount.findOne({ userId });
    if (!wallet) {
      wallet = await WalletAccount.create({
        userId,
        balancePaise: 0,
        reservedPaise: 0,
        creatorPayablePaise: 0,
        currency: 'INR',
        isActive: true,
      });
    }
    return wallet;
  }

  /**
   * Creates a Razorpay order for wallet top-up.
   */
  static async createTopupOrder({ userId, amountPaise }) {
    await this.getOrCreateWallet(userId);

    const receipt = `topup_${userId.toString().slice(-6)}_${Date.now()}`;
    const options = {
      amount: amountPaise,
      currency: 'INR',
      receipt,
      notes: {
        userId: userId.toString(),
        type: 'WALLET_TOPUP',
      },
    };

    try {
      if (razorpayClient && isRealRazorpayConfigured() && env.NODE_ENV !== 'test') {
        const order = await razorpayClient.orders.create(options);
        return {
          orderId: order.id,
          amountPaise: order.amount,
          currency: order.currency,
          keyId: env.RAZORPAY_KEY_ID,
          isLiveRazorpay: true,
        };
      }
    } catch (err) {
      logger.error('Razorpay live order creation failed:', { error: err.message });
      if (env.NODE_ENV === 'production' || env.RAZORPAY_KEY_ID?.startsWith('rzp_live_')) {
        throw new AppError(
          `Razorpay order creation failed: ${err.message}`,
          500,
          'PAYMENT_GATEWAY_ERROR'
        );
      }
    }

    // In production, fallback sandbox mode is strictly disallowed
    if (env.NODE_ENV === 'production' || env.RAZORPAY_KEY_ID?.startsWith('rzp_live_')) {
      throw new AppError(
        'Razorpay live payment gateway is required in production.',
        500,
        'PAYMENT_GATEWAY_REQUIRED'
      );
    }

    // Deterministic fallback for test / local sandbox only
    const fallbackOrderId = `order_sandbox_${crypto.randomBytes(8).toString('hex')}`;
    return {
      orderId: fallbackOrderId,
      amountPaise,
      currency: 'INR',
      keyId: env.RAZORPAY_KEY_ID,
      isLiveRazorpay: false,
    };
  }

  /**
   * Verifies Razorpay payment signature and credits customer balance atomically with double-entry ledger.
   */
  static async verifyAndCreditTopup({
    userId,
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
    amountPaise,
  }) {
    // 1. Verify HMAC SHA256 Signature
    const expectedSignature = crypto
      .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    const isProductionMode =
      env.NODE_ENV === 'production' || env.RAZORPAY_KEY_ID?.startsWith('rzp_live_');
    const isDevSimulated =
      !isProductionMode &&
      env.NODE_ENV !== 'production' &&
      razorpaySignature === 'simulated_dev_payment_signature';

    if (!isDevSimulated && expectedSignature !== razorpaySignature) {
      throw new AppError(
        'Invalid payment signature. Payment verification failed.',
        400,
        'PAYMENT_SIGNATURE_INVALID'
      );
    }

    // 2. Idempotency Check: prevent double-crediting
    const idempotencyKey = `topup_${razorpayPaymentId}`;
    const existingEntry = await LedgerEntry.findOne({ idempotencyKey });
    if (existingEntry) {
      const wallet = await this.getOrCreateWallet(userId);
      return {
        success: true,
        isDuplicate: true,
        message: 'Top-up was already credited previously.',
        wallet,
      };
    }

    // 3. Atomically increment customer wallet balance
    const updatedWallet = await WalletAccount.findOneAndUpdate(
      { userId, isActive: true },
      { $inc: { balancePaise: amountPaise } },
      { new: true, upsert: true }
    );

    // 4. Double-Entry Bookkeeping:
    // Gateway Collection DEBIT, Customer Liability CREDIT
    await LedgerEntry.create([
      {
        entryId: crypto.randomUUID(),
        userId,
        accountType: 'GATEWAY_COLLECTION',
        entryType: 'DEBIT',
        amountPaise,
        currency: 'INR',
        referenceType: 'TOPUP',
        referenceId: razorpayPaymentId,
        idempotencyKey: `${idempotencyKey}_gateway`,
        description: `Payment received from Razorpay Gateway (Order: ${razorpayOrderId})`,
        balanceAfterPaise: amountPaise,
      },
      {
        entryId: crypto.randomUUID(),
        userId,
        accountType: 'CUSTOMER_LIABILITY',
        entryType: 'CREDIT',
        amountPaise,
        currency: 'INR',
        referenceType: 'TOPUP',
        referenceId: razorpayPaymentId,
        idempotencyKey,
        description: `Wallet top-up credited via Razorpay payment ${razorpayPaymentId}`,
        balanceAfterPaise: updatedWallet.balancePaise,
      },
    ]);

    logger.info(`Wallet credited: User ${userId} topped up ₹${amountPaise / 100} (Balance: ₹${updatedWallet.balancePaise / 100})`);

    return {
      success: true,
      isDuplicate: false,
      amountPaise,
      wallet: updatedWallet,
    };
  }

  /**
   * Reserves funds from customer's available balance before or during a video call.
   */
  static async reserveCallBalance({ customerId, callSessionId, estimatedMinutes = 5, ratePerMinutePaise = 700 }) {
    const requiredPaise = estimatedMinutes * ratePerMinutePaise;

    // Ensure wallet exists
    await this.getOrCreateWallet(customerId);

    // Atomically move funds from balancePaise to reservedPaise
    const updatedWallet = await WalletAccount.findOneAndUpdate(
      {
        userId: customerId,
        isActive: true,
        balancePaise: { $gte: requiredPaise },
      },
      {
        $inc: {
          balancePaise: -requiredPaise,
          reservedPaise: requiredPaise,
        },
      },
      { new: true }
    );

    if (!updatedWallet) {
      const currentWallet = await this.getOrCreateWallet(customerId);
      throw new AppError(
        `Insufficient balance. You have ₹${(currentWallet.balancePaise / 100).toFixed(2)}, but ₹${(requiredPaise / 100).toFixed(2)} is required for ${estimatedMinutes} minutes.`,
        400,
        'INSUFFICIENT_FUNDS',
        {
          availableBalancePaise: currentWallet.balancePaise,
          requiredPaise,
          estimatedMinutes,
        }
      );
    }

    const idempotencyKey = `reserve_${callSessionId}_${Date.now()}`;

    // Record ledger entry for reservation
    await LedgerEntry.create({
      entryId: crypto.randomUUID(),
      userId: customerId,
      accountType: 'RESERVED_BUFFER',
      entryType: 'CREDIT',
      amountPaise: requiredPaise,
      currency: 'INR',
      referenceType: 'CALL_RESERVATION',
      referenceId: callSessionId,
      idempotencyKey,
      description: `Held ${estimatedMinutes}m call reservation for session ${callSessionId}`,
      balanceAfterPaise: updatedWallet.reservedPaise,
    });

    return {
      success: true,
      reservedPaise: requiredPaise,
      wallet: updatedWallet,
    };
  }

  /**
   * Settles a finished call session:
   * - Calculates billable duration (first 15 seconds free preview).
   * - Computes total charge: ceil(billableSeconds / 60) * ratePerMinute.
   * - Splits revenue 70% Creator / 30% Platform.
   * - Settles reserved funds and releases remaining unused buffer back to customer balance.
   */
  static async settleCallSession({
    callSessionId,
    durationSeconds = 0,
    ratePerMinutePaise = 700,
    freePreviewSeconds = 15,
  }) {
    const sessionDoc = await CallSession.findOne({ sessionId: callSessionId });
    if (!sessionDoc) {
      throw new AppError(`Call session '${callSessionId}' not found.`, 404, 'SESSION_NOT_FOUND');
    }

    const callerId = sessionDoc.callerId;
    const creatorId = sessionDoc.receiverId;

    // Idempotency: prevent settling the same session twice
    const idempotencyKey = `settle_${callSessionId}`;
    const existingSettlement = await LedgerEntry.findOne({ idempotencyKey });
    if (existingSettlement) {
      return {
        success: true,
        isAlreadySettled: true,
        message: 'Session has already been settled.',
      };
    }

    // 1. Calculate billable units
    // Strict rules:
    // - Free promotional calls bill ₹0
    // - Female callers are 100% free (female never pays for any calls)
    const callerUser = await User.findById(callerId).select('gender');
    const isCallerFemale = callerUser?.gender === 'FEMALE';

    let billableSeconds = 0;
    let billableMinutes = 0;
    let totalChargePaise = 0;

    if (sessionDoc.isFreeCall || isCallerFemale) {
      billableSeconds = 0;
      billableMinutes = 0;
      totalChargePaise = 0;
    } else if (durationSeconds > freePreviewSeconds) {
      billableSeconds = durationSeconds - freePreviewSeconds;
      if (billableSeconds > 0) {
        billableMinutes = Math.ceil(billableSeconds / 60);
        totalChargePaise = billableMinutes * ratePerMinutePaise;
      }
    }

    // 2. Fetch caller and creator wallets
    const callerWallet = await this.getOrCreateWallet(callerId);
    const creatorWallet = await this.getOrCreateWallet(creatorId);

    // Available funds in caller's wallet (both reserved buffer and balance)
    const actualReserved = callerWallet.reservedPaise || 0;
    const actualBalance = callerWallet.balancePaise || 0;
    const totalAvailable = actualReserved + actualBalance;

    const payableCharge = Math.min(totalChargePaise, totalAvailable);
    const deductFromReserved = Math.min(payableCharge, actualReserved);
    const deductFromBalance = payableCharge - deductFromReserved;
    const unusedReservation = actualReserved - deductFromReserved;

    // 3. Revenue Sharing (70% Creator / 30% Platform)
    const platformCommissionPercent = env.PLATFORM_COMMISSION_PERCENT || 30;
    const creatorPercent = 100 - platformCommissionPercent;
    const creatorSharePaise = Math.floor((payableCharge * creatorPercent) / 100);
    const platformSharePaise = payableCharge - creatorSharePaise;

    // 4. Update Caller Wallet:
    // - reservedPaise is cleared (-actualReserved).
    // - balancePaise changes by: unusedReservation - deductFromBalance.
    // (If unusedReservation > 0, refunded to balance; if deductFromBalance > 0, deducted from balance).
    const callerBalanceChange = unusedReservation - deductFromBalance;
    const updatedCallerWallet = await WalletAccount.findOneAndUpdate(
      { userId: callerId },
      {
        $inc: {
          reservedPaise: -actualReserved,
          balancePaise: callerBalanceChange,
        },
      },
      { new: true }
    );

    // 5. Update Creator Wallet: credit creatorPayablePaise
    let updatedCreatorWallet = creatorWallet;
    if (creatorSharePaise > 0) {
      updatedCreatorWallet = await WalletAccount.findOneAndUpdate(
        { userId: creatorId },
        { $inc: { creatorPayablePaise: creatorSharePaise } },
        { new: true }
      );

      // Also increment creator profile aggregate statistics
      await CreatorProfile.findOneAndUpdate(
        { userId: creatorId },
        {
          $inc: {
            totalCallsCompleted: 1,
            totalCallMinutes: billableMinutes,
          },
        }
      );
    }

    // 6. Record Double-Entry Ledger Entries
    const entriesToCreate = [];

    // A. Release of unused reservation buffer back to caller
    if (unusedReservation > 0) {
      entriesToCreate.push({
        entryId: crypto.randomUUID(),
        userId: callerId,
        accountType: 'CUSTOMER_LIABILITY',
        entryType: 'CREDIT',
        amountPaise: unusedReservation,
        currency: 'INR',
        referenceType: 'RESERVATION_RELEASE',
        referenceId: callSessionId,
        idempotencyKey: `release_${callSessionId}`,
        description: `Released unused reservation of ₹${(unusedReservation / 100).toFixed(2)} from session ${callSessionId}`,
        balanceAfterPaise: updatedCallerWallet.balancePaise,
      });
    }

    // B. Settlement of actual charge
    if (payableCharge > 0) {
      // Debit customer (from reserved buffer or customer liability balance)
      entriesToCreate.push({
        entryId: crypto.randomUUID(),
        userId: callerId,
        accountType: deductFromReserved > 0 ? 'RESERVED_BUFFER' : 'CUSTOMER_LIABILITY',
        entryType: 'DEBIT',
        amountPaise: payableCharge,
        currency: 'INR',
        referenceType: 'CALL_SETTLEMENT',
        referenceId: callSessionId,
        idempotencyKey,
        description: `Billed ₹${(payableCharge / 100).toFixed(2)} for ${billableMinutes}m call session ${callSessionId}`,
        balanceAfterPaise: updatedCallerWallet.balancePaise,
      });

      // Credit Creator Payable
      entriesToCreate.push({
        entryId: crypto.randomUUID(),
        userId: creatorId,
        accountType: 'CREATOR_PAYABLE',
        entryType: 'CREDIT',
        amountPaise: creatorSharePaise,
        currency: 'INR',
        referenceType: 'CALL_SETTLEMENT',
        referenceId: callSessionId,
        idempotencyKey: `creator_share_${callSessionId}`,
        description: `Creator earning (${creatorPercent}%) for call session ${callSessionId}`,
        balanceAfterPaise: updatedCreatorWallet.creatorPayablePaise,
      });

      // Credit Platform Revenue
      entriesToCreate.push({
        entryId: crypto.randomUUID(),
        userId: callerId,
        accountType: 'PLATFORM_REVENUE',
        entryType: 'CREDIT',
        amountPaise: platformSharePaise,
        currency: 'INR',
        referenceType: 'CALL_SETTLEMENT',
        referenceId: callSessionId,
        idempotencyKey: `platform_share_${callSessionId}`,
        description: `Platform commission (${platformCommissionPercent}%) for call session ${callSessionId}`,
        balanceAfterPaise: platformSharePaise,
      });
    }

    if (entriesToCreate.length > 0) {
      await LedgerEntry.create(entriesToCreate);
    }

    logger.info(
      `Call settled [${callSessionId}]: duration=${durationSeconds}s, billed=${billableMinutes}m, charge=₹${payableCharge / 100}, creator=₹${creatorSharePaise / 100}, platform=₹${platformSharePaise / 100}`
    );

    return {
      success: true,
      callSessionId,
      durationSeconds,
      freePreviewSeconds,
      billableMinutes,
      ratePerMinutePaise,
      totalChargePaise: payableCharge,
      creatorSharePaise,
      platformSharePaise,
      releasedReservationPaise: unusedReservation,
      callerWallet: updatedCallerWallet,
      creatorWallet: updatedCreatorWallet,
    };
  }

  /**
   * Creator submits a withdrawal payout request.
   */
  static async requestPayout({ creatorId, amountPaise, method, details }) {
    await this.getOrCreateWallet(creatorId);

    // Atomically check and deduct from creatorPayablePaise
    const updatedWallet = await WalletAccount.findOneAndUpdate(
      {
        userId: creatorId,
        isActive: true,
        creatorPayablePaise: { $gte: amountPaise },
      },
      {
        $inc: { creatorPayablePaise: -amountPaise },
      },
      { new: true }
    );

    if (!updatedWallet) {
      const currentWallet = await this.getOrCreateWallet(creatorId);
      throw new AppError(
        `Insufficient payable earnings. You have ₹${(currentWallet.creatorPayablePaise / 100).toFixed(2)}, but requested ₹${(amountPaise / 100).toFixed(2)}.`,
        400,
        'INSUFFICIENT_EARNINGS'
      );
    }

    const payoutId = `payout_${crypto.randomBytes(6).toString('hex')}`;

    const payout = await PayoutRequest.create({
      payoutId,
      creatorId,
      amountPaise,
      method,
      details,
      status: 'PENDING',
    });

    // Record ledger entry
    await LedgerEntry.create({
      entryId: crypto.randomUUID(),
      userId: creatorId,
      accountType: 'CREATOR_PAYABLE',
      entryType: 'DEBIT',
      amountPaise,
      currency: 'INR',
      referenceType: 'PAYOUT',
      referenceId: payoutId,
      idempotencyKey: `payout_debit_${payoutId}`,
      description: `Payout withdrawal request (${method}) for ₹${(amountPaise / 100).toFixed(2)}`,
      balanceAfterPaise: updatedWallet.creatorPayablePaise,
    });

    return {
      success: true,
      payout,
      wallet: updatedWallet,
    };
  }

  /**
   * Admin approves, processes, or rejects payout request.
   * If rejected, the deducted funds are restored to creator's creatorPayablePaise!
   */
  static async processPayoutByAdmin({ payoutId, status, transactionReference = '', adminNotes = '' }) {
    const payout = await PayoutRequest.findOne({ payoutId });
    if (!payout) {
      throw new AppError(`Payout request '${payoutId}' not found.`, 404, 'PAYOUT_NOT_FOUND');
    }

    if (payout.status === 'PROCESSED' || payout.status === 'REJECTED') {
      throw new AppError(
        `Payout request is already ${payout.status.toLowerCase()} and cannot be modified.`,
        400,
        'PAYOUT_ALREADY_FINALIZED'
      );
    }

    payout.status = status;
    payout.adminNotes = adminNotes || payout.adminNotes;
    if (transactionReference) {
      payout.transactionReference = transactionReference;
    }
    if (status === 'PROCESSED') {
      payout.processedAt = new Date();
    }

    // If REJECTED, restore the earnings back to creator's wallet
    if (status === 'REJECTED') {
      const updatedWallet = await WalletAccount.findOneAndUpdate(
        { userId: payout.creatorId },
        { $inc: { creatorPayablePaise: payout.amountPaise } },
        { new: true }
      );

      await LedgerEntry.create({
        entryId: crypto.randomUUID(),
        userId: payout.creatorId,
        accountType: 'CREATOR_PAYABLE',
        entryType: 'CREDIT',
        amountPaise: payout.amountPaise,
        currency: 'INR',
        referenceType: 'REFUND',
        referenceId: payoutId,
        idempotencyKey: `payout_refund_${payoutId}`,
        description: `Restored rejected payout funds: ${adminNotes || 'Declined by admin'}`,
        balanceAfterPaise: updatedWallet.creatorPayablePaise,
      });
    }

    await payout.save();
    return payout;
  }

  /**
   * Fetches paginated ledger audit trail for a user.
   */
  static async getLedgerHistory({ userId, page = 1, limit = 20, referenceType }) {
    const query = { userId };
    if (referenceType) {
      query.referenceType = referenceType;
    }

    const skip = (Math.max(1, page) - 1) * limit;
    const [entries, totalCount] = await Promise.all([
      LedgerEntry.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      LedgerEntry.countDocuments(query),
    ]);

    return {
      entries,
      totalCount,
      page: Number(page),
      totalPages: Math.ceil(totalCount / limit),
    };
  }

  /**
   * Calculates creator earnings summary.
   */
  static async getCreatorEarningsSummary(creatorId) {
    const wallet = await this.getOrCreateWallet(creatorId);

    // Sum all completed settlements for this creator
    const settlementEntries = await LedgerEntry.find({
      userId: creatorId,
      accountType: 'CREATOR_PAYABLE',
      entryType: 'CREDIT',
      referenceType: 'CALL_SETTLEMENT',
    });

    const lifetimeEarnedPaise = settlementEntries.reduce((sum, e) => sum + e.amountPaise, 0);

    // Sum processed payouts
    const processedPayouts = await PayoutRequest.find({
      creatorId,
      status: 'PROCESSED',
    });
    const totalWithdrawnPaise = processedPayouts.reduce((sum, p) => sum + p.amountPaise, 0);

    // Sum pending payouts
    const pendingPayouts = await PayoutRequest.find({
      creatorId,
      status: { $in: ['PENDING', 'APPROVED'] },
    });
    const pendingWithdrawalPaise = pendingPayouts.reduce((sum, p) => sum + p.amountPaise, 0);

    return {
      currency: 'INR',
      availablePayablePaise: wallet.creatorPayablePaise,
      lifetimeEarnedPaise,
      totalWithdrawnPaise,
      pendingWithdrawalPaise,
      recentPayouts: await PayoutRequest.find({ creatorId }).sort({ createdAt: -1 }).limit(10),
    };
  }
}
