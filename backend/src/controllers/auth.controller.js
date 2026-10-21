import { User } from '../models/User.js';
import { CreatorProfile } from '../models/CreatorProfile.js';
import { VerificationRecord } from '../models/VerificationRecord.js';
import { AppError } from '../middlewares/errorHandler.js';
import { isEligibleAdult } from '../utils/ageValidator.js';
import { generateToken, setAuthCookie, clearAuthCookie } from '../utils/token.js';
import { registerSchema, loginSchema, verifyAgeSchema } from '../validators/auth.validator.js';

/**
 * Register a new user (Customer or Creator) with mandatory 18+ verification.
 */
export async function register(req, res, next) {
  try {
    const validatedData = registerSchema.parse(req.body);
    let { displayName, email, password, gender, role, dateOfBirth, ageAffirmation } = validatedData;

    // Strict Rule: Girls / Female users exclusively have the CREATOR role
    if (gender === 'FEMALE') {
      role = 'CREATOR';
    } else if (role === 'CREATOR' && !gender) {
      gender = 'FEMALE';
    } else if (!gender) {
      gender = role === 'CREATOR' ? 'FEMALE' : 'MALE';
    }

    // Strict 18+ Age Check
    const ageResult = isEligibleAdult(dateOfBirth, 18);
    if (!ageResult.isAdult) {
      return next(
        new AppError(
          `Underage Registration Prohibited: You are ${ageResult.age} years old. Spotizan is strictly restricted to adults aged 18 and older.`,
          403,
          'AGE_RESTRICTION_ERROR',
          { declaredAge: ageResult.age, minimumRequired: 18 }
        )
      );
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(
        new AppError('An account with this email address already exists.', 409, 'DUPLICATE_EMAIL')
      );
    }

    // Client audit metadata
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Create User record
    const user = await User.create({
      displayName,
      email,
      password,
      gender,
      genderPreference: req.body.genderPreference || 'ANY',
      role: role || 'CUSTOMER',
      dateOfBirth: new Date(dateOfBirth),
      isAdult: true,
      ageAffirmation: {
        affirmed: true,
        affirmedAt: new Date(),
        ipAddress,
        userAgent,
        legalDeclaration:
          'I certify under penalty of perjury that I am at least 18 years of age and legally permitted to access adult services in my jurisdiction.',
      },
      status: role === 'CREATOR' ? 'PENDING_VERIFICATION' : 'ACTIVE',
    });

    // Auto-create CreatorProfile if registering as Creator / Girl
    if (user.role === 'CREATOR') {
      await CreatorProfile.findOneAndUpdate(
        { userId: user._id },
        {
          userId: user._id,
          displayName: user.displayName,
          pricePerMinutePaise: 900,
          verificationStatus: 'UNSUBMITTED',
          isVerified: false,
          availabilityStatus: 'OFFLINE',
        },
        { upsert: true, new: true }
      );
    }

    // Create immutable VerificationRecord for legal audit trail
    await VerificationRecord.create({
      userId: user._id,
      verificationType: 'AGE_STATUTORY_DECLARATION',
      status: 'APPROVED',
      idType: 'SELF_DECLARATION',
      declaredDateOfBirth: new Date(dateOfBirth),
      verifiedAgeYears: ageResult.age,
      legalDeclarationText:
        'I certify under penalty of perjury that I am at least 18 years of age and legally permitted to access adult services in my jurisdiction.',
      ipAddress,
      userAgent,
    });

    // Issue JWT Token and set HTTP-only cookie
    const token = generateToken(user);
    setAuthCookie(res, token);

    // Sanitize response
    const userResponse = {
      _id: user._id,
      displayName: user.displayName,
      email: user.email,
      role: user.role,
      gender: user.gender,
      isAdult: user.isAdult,
      status: user.status,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
    };

    res.status(201).json({
      success: true,
      message: 'Registration and statutory 18+ age verification successful.',
      data: {
        user: userResponse,
        token,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Log in an existing user with email and password.
 */
export async function login(req, res, next) {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return next(
        new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS')
      );
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return next(
        new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS')
      );
    }

    // Check account status
    if (user.status === 'BANNED' || user.status === 'SUSPENDED') {
      return next(
        new AppError(
          `Your account is ${user.status.toLowerCase()}. Please contact safety and support.`,
          403,
          'ACCOUNT_RESTRICTED'
        )
      );
    }

    // Enforce: girls/female users strictly hold the CREATOR role upon login
    if (user.gender === 'FEMALE' && user.role !== 'ADMIN' && user.role !== 'CREATOR') {
      user.role = 'CREATOR';
      await user.save();
    }

    // Issue JWT Token and set HTTP-only cookie
    const token = generateToken(user);
    setAuthCookie(res, token);

    const userResponse = {
      _id: user._id,
      displayName: user.displayName,
      email: user.email,
      role: user.role,
      gender: user.gender,
      isAdult: user.isAdult,
      status: user.status,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
    };

    res.status(200).json({
      success: true,
      message: 'Logged in successfully.',
      data: {
        user: userResponse,
        token,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Log out user and destroy HTTP-only session cookie.
 */
export function logout(req, res) {
  clearAuthCookie(res);
  res.status(200).json({
    success: true,
    message: 'Logged out successfully.',
  });
}

/**
 * Get profile of currently authenticated user.
 */
export function getMe(req, res) {
  res.status(200).json({
    success: true,
    data: {
      user: {
        _id: req.user._id,
        displayName: req.user.displayName,
        email: req.user.email,
        role: req.user.role,
        gender: req.user.gender,
        genderPreference: req.user.genderPreference || 'ANY',
        isAdult: req.user.isAdult,
        status: req.user.status,
        avatarUrl: req.user.avatarUrl,
        bio: req.user.bio,
        languages: req.user.languages,
        createdAt: req.user.createdAt,
      },
    },
  });
}

/**
 * Update authenticated user profile details.
 */
export async function updateProfile(req, res, next) {
  try {
    const { displayName, bio, languages, genderPreference, avatarUrl } = req.body;
    const allowedFields = {};
    if (displayName && typeof displayName === 'string') {
      allowedFields.displayName = displayName.trim().slice(0, 40);
    }
    if (typeof bio === 'string') {
      allowedFields.bio = bio.trim().slice(0, 300);
    }
    if (Array.isArray(languages)) {
      allowedFields.languages = languages.map((l) => String(l).trim()).filter(Boolean);
    }
    if (['ANY', 'FEMALE', 'MALE'].includes(genderPreference)) {
      allowedFields.genderPreference = genderPreference;
    }
    if (typeof avatarUrl === 'string') {
      allowedFields.avatarUrl = avatarUrl.trim();
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: allowedFields },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      data: {
        user: {
          _id: updatedUser._id,
          displayName: updatedUser.displayName,
          email: updatedUser.email,
          role: updatedUser.role,
          gender: updatedUser.gender,
          genderPreference: updatedUser.genderPreference || 'ANY',
          isAdult: updatedUser.isAdult,
          status: updatedUser.status,
          avatarUrl: updatedUser.avatarUrl,
          bio: updatedUser.bio,
          languages: updatedUser.languages,
          createdAt: updatedUser.createdAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Verify or re-affirm statutory age eligibility for current session.
 */
export async function verifyAge(req, res, next) {
  try {
    const { dateOfBirth } = verifyAgeSchema.parse(req.body);

    const ageResult = isEligibleAdult(dateOfBirth, 18);
    if (!ageResult.isAdult) {
      return next(
        new AppError(
          `Underage verification rejected: ${ageResult.age} years old. Minimum required is 18.`,
          403,
          'AGE_RESTRICTION_ERROR'
        )
      );
    }

    const ipAddress = req.ip || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    req.user.dateOfBirth = new Date(dateOfBirth);
    req.user.isAdult = true;
    req.user.ageAffirmation = {
      affirmed: true,
      affirmedAt: new Date(),
      ipAddress,
      userAgent,
      legalDeclaration:
        'I certify under penalty of perjury that I am at least 18 years of age and legally permitted to access adult services in my jurisdiction.',
    };
    await req.user.save();

    await VerificationRecord.create({
      userId: req.user._id,
      verificationType: 'AGE_STATUTORY_DECLARATION',
      status: 'APPROVED',
      idType: 'SELF_DECLARATION',
      declaredDateOfBirth: new Date(dateOfBirth),
      verifiedAgeYears: ageResult.age,
      legalDeclarationText:
        'I certify under penalty of perjury that I am at least 18 years of age and legally permitted to access adult services in my jurisdiction.',
      ipAddress,
      userAgent,
    });

    res.status(200).json({
      success: true,
      message: 'Age eligibility successfully verified and audited.',
      data: {
        isAdult: true,
        age: ageResult.age,
      },
    });
  } catch (error) {
    next(error);
  }
}
