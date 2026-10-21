import mongoose from 'mongoose';

const verificationRecordSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    verificationType: {
      type: String,
      enum: ['AGE_STATUTORY_DECLARATION', 'GOVT_ID', 'FACIAL_MATCH'],
      default: 'AGE_STATUTORY_DECLARATION',
      required: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'APPROVED',
      index: true,
    },
    idType: {
      type: String,
      enum: ['AADHAAR', 'PAN', 'PASSPORT', 'VOTER_ID', 'DRIVING_LICENSE', 'SELF_DECLARATION'],
      default: 'SELF_DECLARATION',
    },
    idNumberMasked: {
      type: String,
      default: '',
    },
    declaredDateOfBirth: {
      type: Date,
      required: true,
    },
    verifiedAgeYears: {
      type: Number,
      required: true,
    },
    legalDeclarationText: {
      type: String,
      required: true,
    },
    ipAddress: {
      type: String,
      default: 'unknown',
    },
    userAgent: {
      type: String,
      default: 'unknown',
    },
    documentEncryptedUrl: {
      type: String,
      default: '',
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

export const VerificationRecord = mongoose.model(
  'VerificationRecord',
  verificationRecordSchema
);
