import crypto from 'crypto';
import Razorpay from 'razorpay';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { WalletService } from '../services/wallet.service.js';

let razorpayClient = null;

export function getRazorpayClient() {
  if (!razorpayClient && env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET) {
    razorpayClient = new Razorpay({
      key_id: env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpayClient;
}

/**
 * STEP 1: BACKEND - Create Order
 * Endpoint: POST /api/create-order
 * Request: { amount (paise), currency, receipt }
 * Return: { order_id, amount, currency, key_id }
 * Minimum amount: 100 paise
 */
export async function createOrder(req, res) {
  try {
    const rawAmount = req.body.amount ?? req.body.amountPaise;
    const amount = Number(rawAmount);

    // Validate amount >= 100 paise
    if (!rawAmount || isNaN(amount) || amount < 100) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount. Minimum order amount is 100 paise (₹1.00).',
      });
    }

    const currency = (req.body.currency || 'INR').toUpperCase();
    const receipt =
      req.body.receipt ||
      `rcpt_${req.user ? req.user._id.toString().slice(-6) : 'guest'}_${Date.now()}`;

    const options = {
      amount: Math.round(amount),
      currency,
      receipt: String(receipt).slice(0, 40),
      notes: {
        ...(req.body.notes || {}),
        userId: req.user?._id?.toString() || req.body.userId || 'guest',
      },
    };

    const client = getRazorpayClient();
    if (!client) {
      return res.status(500).json({
        success: false,
        error: 'Razorpay payment gateway client is not initialized. Please verify credentials.',
      });
    }

    const order = await client.orders.create(options);

    return res.status(201).json({
      success: true,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    logger.error('Razorpay order creation error:', { error: err.message, stack: err.stack });
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to create Razorpay order',
    });
  }
}

/**
 * STEP 3: BACKEND - Verify Signature
 * Endpoint: POST /api/verify-payment
 * Algorithm: HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
 * Compare generated signature with razorpay_signature
 * Return success only if signatures match
 */
export async function verifyPayment(req, res) {
  try {
    const order_id = req.body.order_id || req.body.razorpay_order_id;
    const payment_id = req.body.payment_id || req.body.razorpay_payment_id;
    const signature = req.body.signature || req.body.razorpay_signature;
    const amount = req.body.amount || req.body.amountPaise;

    // Validate missing fields
    if (!order_id || !payment_id || !signature) {
      return res.status(400).json({
        success: false,
        error:
          'Missing required payment verification fields: order_id, payment_id, and signature are required.',
      });
    }

    // HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
    const expectedSignature = crypto
      .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
      .update(`${order_id}|${payment_id}`)
      .digest('hex');

    // Timing-safe comparison to prevent timing attacks
    let isMatch = false;
    try {
      const expectedBuf = Buffer.from(expectedSignature, 'utf-8');
      const signatureBuf = Buffer.from(signature, 'utf-8');
      if (expectedBuf.length === signatureBuf.length) {
        isMatch = crypto.timingSafeEqual(expectedBuf, signatureBuf);
      }
    } catch {
      isMatch = false;
    }

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment signature. Verification failed.',
        isPaid: false,
      });
    }

    // If authenticated user or wallet amount provided, credit wallet atomically with double-entry ledger
    let walletResult = null;
    if (req.user && amount && Number(amount) > 0) {
      try {
        walletResult = await WalletService.verifyAndCreditTopup({
          userId: req.user._id,
          razorpayOrderId: order_id,
          razorpayPaymentId: payment_id,
          razorpaySignature: signature,
          amountPaise: Math.round(Number(amount)),
        });
      } catch (walletErr) {
        logger.warn('Wallet crediting warning during payment verify:', {
          error: walletErr.message,
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Payment verified successfully.',
      isPaid: true,
      order_id,
      payment_id,
      wallet: walletResult?.wallet || null,
    });
  } catch (err) {
    logger.error('Razorpay payment verification error:', { error: err.message });
    return res.status(500).json({
      success: false,
      error: err.message || 'Payment verification processing failed',
    });
  }
}

/**
 * Production Razorpay Webhook Handler
 * Endpoint: POST /api/razorpay-webhook
 * Asynchronously confirms payments (payment.captured, order.paid)
 */
export async function handleWebhook(req, res) {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const webhookSecret = env.RAZORPAY_WEBHOOK_SECRET || env.RAZORPAY_KEY_SECRET;

    if (!signature) {
      return res.status(400).json({ success: false, message: 'Missing x-razorpay-signature header' });
    }

    const payload = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('hex');

    if (expectedSignature !== signature) {
      return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
    }

    const event = req.body.event;
    if (event === 'payment.captured' || event === 'order.paid') {
      const paymentEntity = req.body.payload?.payment?.entity;
      if (paymentEntity && paymentEntity.status === 'captured') {
        const userId = paymentEntity.notes?.userId;
        const amountPaise = paymentEntity.amount;
        const orderId = paymentEntity.order_id;
        const paymentId = paymentEntity.id;

        if (userId && userId !== 'guest') {
          await WalletService.verifyAndCreditTopup({
            userId,
            razorpayOrderId: orderId,
            razorpayPaymentId: paymentId,
            razorpaySignature: signature,
            amountPaise,
          });
        }
      }
    }

    return res.status(200).json({ status: 'ok' });
  } catch (err) {
    logger.error('Razorpay webhook handling error:', { error: err.message });
    return res.status(500).json({ status: 'error', message: err.message });
  }
}
