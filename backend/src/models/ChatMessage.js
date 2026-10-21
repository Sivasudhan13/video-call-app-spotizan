import mongoose from 'mongoose';

const chatMessageSchema = new mongoose.Schema(
  {
    callSessionId: {
      type: String,
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    senderName: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
      maxlength: 1000,
      trim: true,
    },
    translation: {
      translatedText: String,
      sourceLanguage: String,
      targetLanguage: String,
    },
  },
  {
    timestamps: true,
  }
);

// Auto-expire chat messages after 24 hours for safety & privacy compliance
chatMessageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

export const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);
