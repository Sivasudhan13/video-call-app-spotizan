import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    displayName: {
      type: String,
      required: [true, 'Display name is required'],
      trim: true,
      minlength: [2, 'Display name must be at least 2 characters'],
      maxlength: [40, 'Display name cannot exceed 40 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email address is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
      index: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    gender: {
      type: String,
      enum: {
        values: ['FEMALE', 'MALE', 'OTHER'],
        message: 'Invalid gender specification',
      },
      default: 'MALE',
      index: true,
    },
    genderPreference: {
      type: String,
      enum: ['ANY', 'FEMALE', 'MALE'],
      default: 'ANY',
      index: true,
    },
    role: {
      type: String,
      enum: {
        values: ['CUSTOMER', 'CREATOR', 'ADMIN'],
        message: 'Invalid user role',
      },
      default: 'CUSTOMER',
      index: true,
    },
    dateOfBirth: {
      type: Date,
      required: [true, 'Date of birth is required for age eligibility verification'],
    },
    isAdult: {
      type: Boolean,
      default: false,
      index: true,
    },
    ageAffirmation: {
      affirmed: {
        type: Boolean,
        required: [true, 'Statutory 18+ age eligibility affirmation is mandatory'],
      },
      affirmedAt: {
        type: Date,
        default: Date.now,
      },
      ipAddress: {
        type: String,
        default: 'unknown',
      },
      userAgent: {
        type: String,
        default: 'unknown',
      },
      legalDeclaration: {
        type: String,
        default:
          'I certify under penalty of perjury that I am at least 18 years of age and legally permitted to access adult services in my jurisdiction.',
      },
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'SUSPENDED', 'BANNED', 'PENDING_VERIFICATION'],
      default: 'ACTIVE',
      index: true,
    },
    avatarUrl: {
      type: String,
      default: '',
    },
    bio: {
      type: String,
      maxlength: [300, 'Bio cannot exceed 300 characters'],
      default: '',
    },
    languages: {
      type: [String],
      default: ['English', 'Hindi'],
    },
    subscriptionTier: {
      type: String,
      enum: ['FREE', 'PREMIUM', 'VIP'],
      default: 'FREE',
      index: true,
    },
    isPremium: {
      type: Boolean,
      default: false,
      index: true,
    },
    lastFreeCallAt: {
      type: Date,
      default: null,
      index: true,
    },
    freeCallReservedUntil: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Default gender if not provided
userSchema.pre('validate', function (next) {
  if (!this.gender) {
    this.gender = this.role === 'CREATOR' ? 'FEMALE' : 'MALE';
  }
  next();
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password helper
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model('User', userSchema);
