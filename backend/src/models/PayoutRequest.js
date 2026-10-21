import mongoose from 'mongoose';

const payoutRequestSchema = new mongoose.Schema(
  {
    payoutId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    creatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amountPaise: {
      type: Number,
      required: true,
      min: [50000, 'Minimum creator payout is ₹500 (50,000 paise)'],
    },
    currency: {
      type: String,
      default: 'INR',
    },
    method: {
      type: String,
      enum: ['UPI', 'BANK_TRANSFER'],
      required: true,
    },
    details: {
      upiId: {
        type: String,
        trim: true,
      },
      accountHolderName: {
        type: String,
        trim: true,
      },
      bankAccountNumber: {
        type: String,
        trim: true,
      },
      ifscCode: {
        type: String,
        trim: true,
        uppercase: true,
      },
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'PROCESSED', 'REJECTED'],
      default: 'PENDING',
      index: true,
    },
    transactionReference: {
      type: String,
      default: '',
    },
    adminNotes: {
      type: String,
      default: '',
    },
    processedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const PayoutRequest = mongoose.model('PayoutRequest', payoutRequestSchema);
