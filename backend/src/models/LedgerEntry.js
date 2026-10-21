import mongoose from 'mongoose';

const ledgerEntrySchema = new mongoose.Schema(
  {
    entryId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    accountType: {
      type: String,
      enum: [
        'CUSTOMER_LIABILITY',
        'RESERVED_BUFFER',
        'PLATFORM_REVENUE',
        'CREATOR_PAYABLE',
        'GATEWAY_COLLECTION',
      ],
      required: true,
      index: true,
    },
    entryType: {
      type: String,
      enum: ['DEBIT', 'CREDIT'],
      required: true,
    },
    // Exact monetary value in integer paise
    amountPaise: {
      type: Number,
      required: true,
      min: [1, 'Ledger entry amount must be at least 1 paise'],
    },
    currency: {
      type: String,
      default: 'INR',
    },
    referenceType: {
      type: String,
      enum: [
        'TOPUP',
        'CALL_RESERVATION',
        'CALL_SETTLEMENT',
        'RESERVATION_RELEASE',
        'REFUND',
        'PAYOUT',
      ],
      required: true,
      index: true,
    },
    referenceId: {
      type: String,
      required: true,
      index: true,
    },
    idempotencyKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
    },
    balanceAfterPaise: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const LedgerEntry = mongoose.model('LedgerEntry', ledgerEntrySchema);
