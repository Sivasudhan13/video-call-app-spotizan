import mongoose from 'mongoose';

const userReportSchema = new mongoose.Schema(
  {
    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    reportedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    callSessionId: {
      type: String,
      trim: true,
      index: true,
    },
    reason: {
      type: String,
      required: true,
      enum: [
        'INAPPROPRIATE_BEHAVIOR',
        'UNDERAGE_SUSPICION',
        'HARASSMENT_OR_ABUSE',
        'SPAM_OR_SCAM',
        'NON_CONSENSUAL_RECORDING',
        'OTHER',
      ],
    },
    details: {
      type: String,
      maxlength: 1000,
      default: '',
    },
    status: {
      type: String,
      enum: ['PENDING', 'INVESTIGATING', 'RESOLVED_ACTIONED', 'DISMISSED'],
      default: 'PENDING',
      index: true,
    },
    adminNotes: {
      type: String,
      default: '',
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export const UserReport = mongoose.model('UserReport', userReportSchema);
