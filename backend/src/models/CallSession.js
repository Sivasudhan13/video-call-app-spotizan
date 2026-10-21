import mongoose from 'mongoose';

const callSessionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    callerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    callType: {
      type: String,
      enum: ['RANDOM_QUEUE', 'DIRECT_CALL'],
      default: 'RANDOM_QUEUE',
      index: true,
    },
    status: {
      type: String,
      enum: [
        'WAITING',
        'RINGING',
        'ACCEPTED',
        'CONNECTING',
        'ACTIVE',
        'COMPLETED',
        'FAILED',
        'CANCELLED',
      ],
      default: 'WAITING',
      index: true,
    },
    // Rates in integer paise (₹7 = 700 paise)
    ratePerMinutePaise: {
      type: Number,
      default: 700,
      min: 0,
    },
    freePreviewDurationSeconds: {
      type: Number,
      default: 15,
    },
    isFreePreview: {
      type: Boolean,
      default: true,
    },
    isFreeCall: {
      type: Boolean,
      default: false,
      index: true,
    },
    maxFreeCallDurationSeconds: {
      type: Number,
      default: 120, // 2 minutes maximum free call
    },
    startedAt: {
      type: Date,
      default: null,
    },
    connectedAt: {
      type: Date,
      default: null,
    },
    endedAt: {
      type: Date,
      default: null,
    },
    durationSeconds: {
      type: Number,
      default: 0,
    },
    endReason: {
      type: String,
      enum: [
        'USER_HUNG_UP',
        'PEER_DISCONNECTED',
        'BALANCE_DEPLETED',
        'TIMEOUT',
        'FAILED',
        'SKIPPED',
        'SAFETY_TERMINATED',
        'NONE',
      ],
      default: 'NONE',
    },
  },
  {
    timestamps: true,
  }
);

export const CallSession = mongoose.model('CallSession', callSessionSchema);
