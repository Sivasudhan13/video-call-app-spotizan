import crypto from 'crypto';
import Razorpay from 'razorpay';
import { User } from '../models/User.js';
import { Subscription } from '../models/Subscription.js';
import { LedgerEntry } from '../models/LedgerEntry.js';
import { AppError } from '../middlewares/errorHandler.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export const SUBSCRIPTION_PLANS = {
  FREE: {
    id: 'FREE',
    name: 'Standard Adult Discovery',
    pricePaise: 0,
    priceRupees: 0,
    durationDays: 0,
    features: [
      'Standard random WebRTC video matching',
      '15-Second Free Preview guarantee',
      'Pay-per-minute creator calling (₹7–₹15/min)',
      'Basic community text chat',
    ],
  },
  PREMIUM: {
    id: 'PREMIUM',
    name: 'Premium Explorer',
    pricePaise: 49900, // ₹499
    priceRupees: 499,
    durationDays: 30,
    features: [
      'Priority Matching (Skip 80% queue wait time)',
      'Advanced Language & Regional filters',
      'Ad-free uninterrupted interface',
      'Blurred Preview reveal toggle',
      'HD 720p/1080p WebRTC bandwidth allocation',
    ],
  },
  VIP: {
    id: 'VIP',
    name: 'VIP Global Elite',
    pricePaise: 99900, // ₹999
    priceRupees: 999,
    durationDays: 30,
    features: [
      'Top Priority Instant Matching',
      'Exclusive VIP Badge on Discovery profile',
      'All Global Region & Country filters',
      'Real-time message translation assistance',
      'Zero platform transaction fee on wallet top-ups',
      'Dedicated 24/7 priority compliance support',
    ],
  },
};

let razorpayClient = null;
function getRazorpayClient() {
  if (!razorpayClient && env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET) {
    razorpayClient = new Razorpay({
      key_id: env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpayClient;
}

export class SubscriptionService {
  /**
   * Returns list of configured subscription plans.
   */
  static getPlans() {
    return Object.values(SUBSCRIPTION_PLANS);
  }

  /**
   * Initializes Razorpay order for subscription checkout.
   */
  static async createSubscriptionOrder({ userId, planId }) {
    const plan = SUBSCRIPTION_PLANS[planId];
    if (!plan || plan.id === 'FREE') {
      throw new AppError('Invalid subscription plan selected.', 400, 'INVALID_PLAN');
    }

    const receipt = `sub_${userId.toString().slice(-6)}_${Date.now()}`;
    const options = {
      amount: plan.pricePaise,
      currency: 'INR',
      receipt: receipt.slice(0, 40),
      notes: {
        userId: userId.toString(),
        type: 'SUBSCRIPTION',
        planId: plan.id,
      },
    };

    try {
      const client = getRazorpayClient();
      if (client && env.NODE_ENV !== 'test') {
        const order = await client.orders.create(options);
        return {
          order_id: order.id,
          amount: order.amount,
          currency: order.currency,
          key_id: env.RAZORPAY_KEY_ID,
          planId: plan.id,
        };
      }
    } catch (err) {
      logger.error('Razorpay subscription order error:', { error: err.message });
      if (env.NODE_ENV === 'production' || env.RAZORPAY_KEY_ID?.startsWith('rzp_live_')) {
        throw new AppError(`Razorpay order creation failed: ${err.message}`, 500, 'GATEWAY_ERROR');
      }
    }

    // Fallback sandbox order for test environment
    const fallbackOrderId = `order_sub_sandbox_${crypto.randomBytes(6).toString('hex')}`;
    return {
      order_id: fallbackOrderId,
      amount: plan.pricePaise,
      currency: 'INR',
      key_id: env.RAZORPAY_KEY_ID,
      planId: plan.id,
    };
  }

  /**
   * Verifies payment signature and activates membership.
   */
  static async verifyAndActivateSubscription({
    userId,
    orderId,
    paymentId,
    signature,
    planId,
  }) {
    const plan = SUBSCRIPTION_PLANS[planId];
    if (!plan) {
      throw new AppError('Invalid plan ID.', 400, 'INVALID_PLAN');
    }

    // 1. Signature Verification
    const expectedSignature = crypto
      .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const isSimulated =
      env.NODE_ENV !== 'production' &&
      !env.RAZORPAY_KEY_ID?.startsWith('rzp_live_') &&
      signature === 'simulated_dev_payment_signature';

    if (!isSimulated && expectedSignature !== signature) {
      throw new AppError('Payment signature verification failed.', 400, 'INVALID_SIGNATURE');
    }

    // 2. Compute subscription dates
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);

    // 3. Upsert Subscription record
    const subscription = await Subscription.findOneAndUpdate(
      { userId },
      {
        userId,
        plan: plan.id,
        status: 'ACTIVE',
        amountPaise: plan.pricePaise,
        currency: 'INR',
        billingCycle: 'MONTHLY',
        startDate,
        endDate,
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        features: {
          priorityMatching: true,
          genderFilter: plan.id === 'VIP',
          regionFilter: true,
          adFree: true,
          vipBadge: plan.id === 'VIP',
        },
      },
      { upsert: true, new: true }
    );

    // 4. Update User Profile
    await User.findByIdAndUpdate(userId, {
      isPremium: true,
      subscriptionTier: plan.id,
    });

    // 5. Bookkeeping Ledger
    await LedgerEntry.create({
      entryId: crypto.randomUUID(),
      userId,
      accountType: 'PLATFORM_REVENUE',
      entryType: 'CREDIT',
      amountPaise: plan.pricePaise,
      currency: 'INR',
      referenceType: 'TOPUP',
      referenceId: paymentId,
      idempotencyKey: `sub_${paymentId}`,
      description: `Premium Subscription Activation: ${plan.name}`,
      balanceAfterPaise: plan.pricePaise,
    });

    return {
      success: true,
      message: `Successfully upgraded to ${plan.name}!`,
      subscription,
    };
  }

  /**
   * Get active subscription for a user.
   */
  static async getUserSubscription(userId) {
    const sub = await Subscription.findOne({
      userId,
      status: 'ACTIVE',
      endDate: { $gte: new Date() },
    });

    if (!sub) {
      return {
        isSubscribed: false,
        plan: SUBSCRIPTION_PLANS.FREE,
      };
    }

    return {
      isSubscribed: true,
      plan: SUBSCRIPTION_PLANS[sub.plan] || SUBSCRIPTION_PLANS.FREE,
      subscription: sub,
    };
  }
}
