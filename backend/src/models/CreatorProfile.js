import mongoose from 'mongoose';

const creatorProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    bio: {
      type: String,
      maxlength: 500,
      default: '',
    },
    avatarUrl: {
      type: String,
      default: '',
    },
    coverUrl: {
      type: String,
      default: '',
    },
    interests: {
      type: [String],
      default: ['Conversations', 'Casual Chat'],
    },
    languages: {
      type: [String],
      default: ['English', 'Hindi'],
    },
    // Rates in integer paise (₹7 = 700 paise, ₹9 = 900 paise, ₹15 = 1500 paise)
    pricePerMinutePaise: {
      type: Number,
      required: true,
      default: 900,
      min: [700, 'Minimum rate allowed is ₹7 (700 paise) per minute'],
      max: [1500, 'Maximum rate allowed is ₹15 (1500 paise) per minute'],
    },
    pricingTier: {
      type: String,
      enum: ['PROMOTIONAL', 'STANDARD', 'PREMIUM'],
      default: 'STANDARD',
    },
    availabilityStatus: {
      type: String,
      enum: ['ONLINE', 'BUSY', 'OFFLINE'],
      default: 'OFFLINE',
      index: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    verificationStatus: {
      type: String,
      enum: ['UNSUBMITTED', 'PENDING', 'APPROVED', 'REJECTED'],
      default: 'UNSUBMITTED',
      index: true,
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    ratingAverage: {
      type: Number,
      default: 5.0,
      min: 1.0,
      max: 5.0,
    },
    totalRatingsCount: {
      type: Number,
      default: 0,
    },
    totalCallsCompleted: {
      type: Number,
      default: 0,
    },
    totalCallMinutes: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Helper method to compute pricing tier from price in paise
creatorProfileSchema.pre('save', function (next) {
  if (this.isModified('pricePerMinutePaise')) {
    if (this.pricePerMinutePaise <= 750) {
      this.pricingTier = 'PROMOTIONAL';
    } else if (this.pricePerMinutePaise <= 1100) {
      this.pricingTier = 'STANDARD';
    } else {
      this.pricingTier = 'PREMIUM';
    }
  }
  next();
});

export const CreatorProfile = mongoose.model('CreatorProfile', creatorProfileSchema);
