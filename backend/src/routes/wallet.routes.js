import { Router } from 'express';
import { protect, authorize, requireAdult } from '../middlewares/auth.js';
import {
  getMyWallet,
  createTopupOrder,
  verifyTopup,
  reserveCallBalance,
  settleCallSession,
  requestPayout,
  getCreatorEarnings,
  getLedgerHistory,
  adminGetPayoutRequests,
  adminProcessPayout,
} from '../controllers/wallet.controller.js';

export const walletRouter = Router();
export const adminWalletRouter = Router();

// Customer & Creator Wallet Operations
walletRouter.get('/me', protect, requireAdult, getMyWallet);
walletRouter.post('/topup/order', protect, requireAdult, createTopupOrder);
walletRouter.post('/topup/verify', protect, requireAdult, verifyTopup);
walletRouter.post('/reserve-call', protect, requireAdult, reserveCallBalance);
walletRouter.post('/settle-call', protect, requireAdult, settleCallSession);
walletRouter.get('/ledger', protect, requireAdult, getLedgerHistory);

// Creator-specific monetization operations
walletRouter.post('/payout/request', protect, requireAdult, authorize('CREATOR'), requestPayout);
walletRouter.get(
  '/creator-earnings',
  protect,
  requireAdult,
  authorize('CREATOR'),
  getCreatorEarnings
);

// Admin-specific payout moderation & processing
adminWalletRouter.get('/payouts', protect, authorize('ADMIN'), adminGetPayoutRequests);
adminWalletRouter.patch(
  '/payouts/:payoutId',
  protect,
  authorize('ADMIN'),
  adminProcessPayout
);
