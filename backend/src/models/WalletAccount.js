import mongoose from 'mongoose';

const walletAccountSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    // Available customer balance for calls in integer paise
    balancePaise: {
      type: Number,
      default: 0,
      min: [0, 'Wallet balance cannot be negative'],
    },
    // Balance temporarily locked during an active call in integer paise
    reservedPaise: {
      type: Number,
      default: 0,
      min: [0, 'Reserved balance cannot be negative'],
    },
    // Earnings accumulated by creator eligible for payout in integer paise
    creatorPayablePaise: {
      type: Number,
      default: 0,
      min: [0, 'Creator payable earnings cannot be negative'],
    },
    currency: {
      type: String,
      default: 'INR',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export const WalletAccount = mongoose.model('WalletAccount', walletAccountSchema);
