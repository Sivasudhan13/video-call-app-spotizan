import { Router } from 'express';
import { createOrder, verifyPayment, handleWebhook } from '../controllers/payment.controller.js';
import { optionalProtect } from '../middlewares/auth.js';

export const paymentRouter = Router();

// STEP 1: Create Razorpay Order (POST /api/create-order)
paymentRouter.post('/create-order', optionalProtect, createOrder);

// STEP 3: Verify Razorpay Signature (POST /api/verify-payment)
paymentRouter.post('/verify-payment', optionalProtect, verifyPayment);

// Production Razorpay Webhook (POST /api/razorpay-webhook)
paymentRouter.post('/razorpay-webhook', handleWebhook);
