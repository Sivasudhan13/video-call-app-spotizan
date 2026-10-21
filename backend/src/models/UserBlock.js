import mongoose from 'mongoose';

const userBlockSchema = new mongoose.Schema(
  {
    blockerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    blockedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    reason: {
      type: String,
      maxlength: 200,
      default: 'User requested block',
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate blocks
userBlockSchema.index({ blockerId: 1, blockedUserId: 1 }, { unique: true });

export const UserBlock = mongoose.model('UserBlock', userBlockSchema);
