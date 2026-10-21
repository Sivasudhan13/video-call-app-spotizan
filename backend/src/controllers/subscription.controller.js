import { SubscriptionService } from '../services/subscription.service.js';

export async function getSubscriptionPlans(req, res, next) {
  try {
    const plans = SubscriptionService.getPlans();
    res.json({
      success: true,
      data: { plans },
    });
  } catch (err) {
    next(err);
  }
}

export async function getMySubscription(req, res, next) {
  try {
    const subData = await SubscriptionService.getUserSubscription(req.user._id);
    res.json({
      success: true,
      data: subData,
    });
  } catch (err) {
    next(err);
  }
}

export async function createSubscriptionOrder(req, res, next) {
  try {
    const { planId } = req.body;
    const orderData = await SubscriptionService.createSubscriptionOrder({
      userId: req.user._id,
      planId,
    });
    res.status(201).json({
      success: true,
      message: 'Subscription order initialized',
      data: orderData,
    });
  } catch (err) {
    next(err);
  }
}

export async function verifySubscription(req, res, next) {
  try {
    const { orderId, paymentId, signature, planId } = req.body;
    const result = await SubscriptionService.verifyAndActivateSubscription({
      userId: req.user._id,
      orderId,
      paymentId,
      signature,
      planId,
    });
    res.json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}
