import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    plan: {
      type: String,
      enum: ['FREE', 'PREMIUM', 'VIP'],
      default: 'FREE',
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'EXPIRED', 'CANCELLED', 'PAST_DUE'],
      default: 'ACTIVE',
      index: true,
    },
    amountPaise: {
      type: Number,
      required: true,
      default: 0,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    billingCycle: {
      type: String,
      enum: ['MONTHLY', 'QUARTERLY', 'ANNUAL', 'LIFETIME'],
      default: 'MONTHLY',
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: true,
      index: true,
    },
    razorpayOrderId: {
      type: String,
      trim: true,
    },
    razorpayPaymentId: {
      type: String,
      trim: true,
      index: true,
    },
    features: {
      priorityMatching: { type: Boolean, default: false },
      genderFilter: { type: Boolean, default: false },
      regionFilter: { type: Boolean, default: false },
      adFree: { type: Boolean, default: true },
      vipBadge: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
  }
);

export const Subscription = mongoose.model('Subscription', subscriptionSchema);
