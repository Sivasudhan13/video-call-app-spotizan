import { WalletService } from '../services/wallet.service.js';
import { PayoutRequest } from '../models/PayoutRequest.js';
import {
  topupOrderSchema,
  topupVerifySchema,
  reserveCallBalanceSchema,
  settleCallSessionSchema,
  payoutRequestSchema,
  adminUpdatePayoutSchema,
} from '../validators/wallet.validator.js';

export async function getMyWallet(req, res, next) {
  try {
    const wallet = await WalletService.getOrCreateWallet(req.user._id);
    res.json({
      success: true,
      data: {
        userId: wallet.userId,
        balancePaise: wallet.balancePaise,
        reservedPaise: wallet.reservedPaise,
        creatorPayablePaise: wallet.creatorPayablePaise,
        currency: wallet.currency,
        isActive: wallet.isActive,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function createTopupOrder(req, res, next) {
  try {
    const validated = topupOrderSchema.parse(req.body);
    const orderData = await WalletService.createTopupOrder({
      userId: req.user._id,
      amountPaise: validated.amountPaise,
    });

    res.status(201).json({
      success: true,
      message: 'Razorpay top-up order initialized successfully.',
      data: orderData,
    });
  } catch (err) {
    next(err);
  }
}

export async function verifyTopup(req, res, next) {
  try {
    const validated = topupVerifySchema.parse(req.body);
    const result = await WalletService.verifyAndCreditTopup({
      userId: req.user._id,
      razorpayOrderId: validated.razorpayOrderId,
      razorpayPaymentId: validated.razorpayPaymentId,
      razorpaySignature: validated.razorpaySignature,
      amountPaise: validated.amountPaise,
    });

    res.json({
      success: true,
      message: result.message || 'Payment verified and wallet credited successfully.',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

export async function reserveCallBalance(req, res, next) {
  try {
    const validated = reserveCallBalanceSchema.parse(req.body);
    const result = await WalletService.reserveCallBalance({
      customerId: req.user._id,
      callSessionId: validated.callSessionId,
      estimatedMinutes: validated.estimatedMinutes,
      ratePerMinutePaise: validated.ratePerMinutePaise,
    });

    res.json({
      success: true,
      message: 'Funds reserved successfully for video call.',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

export async function settleCallSession(req, res, next) {
  try {
    const validated = settleCallSessionSchema.parse(req.body);
    const result = await WalletService.settleCallSession({
      callSessionId: validated.callSessionId,
      durationSeconds: validated.durationSeconds,
      ratePerMinutePaise: validated.ratePerMinutePaise,
    });

    res.json({
      success: true,
      message: 'Call session settled and revenue shared successfully.',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

export async function requestPayout(req, res, next) {
  try {
    const validated = payoutRequestSchema.parse(req.body);
    const result = await WalletService.requestPayout({
      creatorId: req.user._id,
      amountPaise: validated.amountPaise,
      method: validated.method,
      details: validated.details,
    });

    res.status(201).json({
      success: true,
      message: 'Payout withdrawal requested successfully.',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

export async function getCreatorEarnings(req, res, next) {
  try {
    const summary = await WalletService.getCreatorEarningsSummary(req.user._id);
    res.json({
      success: true,
      data: summary,
    });
  } catch (err) {
    next(err);
  }
}

export async function getLedgerHistory(req, res, next) {
  try {
    const { page = 1, limit = 20, referenceType } = req.query;
    const history = await WalletService.getLedgerHistory({
      userId: req.user._id,
      page: Number(page),
      limit: Number(limit),
      referenceType,
    });

    res.json({
      success: true,
      data: history,
    });
  } catch (err) {
    next(err);
  }
}

export async function adminGetPayoutRequests(req, res, next) {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status) query.status = status;

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);
    const [payouts, totalCount] = await Promise.all([
      PayoutRequest.find(query)
        .populate('creatorId', 'displayName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      PayoutRequest.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        payouts,
        totalCount,
        page: Number(page),
        totalPages: Math.ceil(totalCount / Number(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function adminProcessPayout(req, res, next) {
  try {
    const { payoutId } = req.params;
    const validated = adminUpdatePayoutSchema.parse(req.body);

    const updatedPayout = await WalletService.processPayoutByAdmin({
      payoutId,
      status: validated.status,
      transactionReference: validated.transactionReference,
      adminNotes: validated.adminNotes,
    });

    res.json({
      success: true,
      message: `Payout request ${validated.status.toLowerCase()} successfully.`,
      data: updatedPayout,
    });
  } catch (err) {
    next(err);
  }
}
