import { Router } from 'express';
import {
  getSubscriptionPlans,
  getMySubscription,
  createSubscriptionOrder,
  verifySubscription,
} from '../controllers/subscription.controller.js';
import { protect, optionalProtect } from '../middlewares/auth.js';

export const subscriptionRouter = Router();

// Public: view plans
subscriptionRouter.get('/plans', getSubscriptionPlans);

// Protected: manage my membership
subscriptionRouter.get('/me', protect, getMySubscription);
subscriptionRouter.post('/checkout', protect, createSubscriptionOrder);
subscriptionRouter.post('/verify', protect, verifySubscription);
