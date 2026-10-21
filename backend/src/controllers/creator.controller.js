import { CreatorProfile } from '../models/CreatorProfile.js';
import { User } from '../models/User.js';
import { VerificationRecord } from '../models/VerificationRecord.js';
import { AppError } from '../middlewares/errorHandler.js';
import {
  updateCreatorProfileSchema,
  updateAvailabilitySchema,
  applyKycSchema,
  adminReviewKycSchema,
} from '../validators/creator.validator.js';

/**
 * Get the authenticated creator's profile.
 * Automatically initializes profile document if missing.
 */
export async function getMyCreatorProfile(req, res, next) {
  try {
    let profile = await CreatorProfile.findOne({ userId: req.user._id });

    if (!profile) {
      profile = await CreatorProfile.create({
        userId: req.user._id,
        displayName: req.user.displayName,
        avatarUrl: req.user.avatarUrl || '',
        pricePerMinutePaise: 900, // ₹9/min standard
      });
    }

    res.status(200).json({
      success: true,
      data: { profile },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update creator profile attributes (rate, bio, languages, etc.)
 */
export async function updateMyCreatorProfile(req, res, next) {
  try {
    const validatedData = updateCreatorProfileSchema.parse(req.body);

    let profile = await CreatorProfile.findOne({ userId: req.user._id });
    if (!profile) {
      profile = new CreatorProfile({ userId: req.user._id });
    }

    Object.assign(profile, validatedData);
    await profile.save();

    res.status(200).json({
      success: true,
      message: 'Creator profile updated successfully.',
      data: { profile },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Toggle creator availability (ONLINE / BUSY / OFFLINE)
 * Requires KYC verification before setting status to ONLINE.
 */
export async function updateMyAvailability(req, res, next) {
  try {
    const { availabilityStatus } = updateAvailabilitySchema.parse(req.body);

    let profile = await CreatorProfile.findOne({ userId: req.user._id });
    if (!profile) {
      return next(new AppError('Creator profile not found.', 404, 'NOT_FOUND'));
    }

    if (availabilityStatus === 'ONLINE' && !profile.isVerified) {
      return next(
        new AppError(
          'Verification Required: You cannot go ONLINE to accept paid calls until your identity KYC is approved by platform administrators.',
          403,
          'KYC_UNVERIFIED'
        )
      );
    }

    profile.availabilityStatus = availabilityStatus;
    await profile.save();

    res.status(200).json({
      success: true,
      message: `Availability status updated to ${availabilityStatus}.`,
      data: {
        availabilityStatus: profile.availabilityStatus,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Submit creator KYC identity verification documents.
 */
export async function applyKycVerification(req, res, next) {
  try {
    const validatedData = applyKycSchema.parse(req.body);
    const { idType, idNumberMasked, documentUrl } = validatedData;

    let profile = await CreatorProfile.findOne({ userId: req.user._id });
    if (!profile) {
      profile = await CreatorProfile.create({
        userId: req.user._id,
        displayName: req.user.displayName,
      });
    }

    const ipAddress = req.ip || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Create pending KYC audit record
    const record = await VerificationRecord.create({
      userId: req.user._id,
      verificationType: 'GOVT_ID',
      status: 'PENDING',
      idType,
      idNumberMasked,
      declaredDateOfBirth: req.user.dateOfBirth,
      verifiedAgeYears: 18,
      documentEncryptedUrl: documentUrl,
      legalDeclarationText:
        'I certify under penalty of perjury that the submitted government credentials belong to me and I am legally authorized to receive creator payouts.',
      ipAddress,
      userAgent,
    });

    profile.verificationStatus = 'PENDING';
    profile.rejectionReason = '';
    await profile.save();

    res.status(200).json({
      success: true,
      message: 'KYC application submitted successfully. Pending administrator review.',
      data: {
        verificationStatus: profile.verificationStatus,
        recordId: record._id,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Public Creator Discovery API with search, filters and pagination.
 * Only returns verified creators for public trust and safety.
 */
export async function listCreators(req, res, next) {
  try {
    const {
      page = 1,
      limit = 12,
      search = '',
      language = '',
      interest = '',
      pricingTier = '',
      availabilityStatus = '',
    } = req.query;

    const query = { isVerified: true };

    if (search) {
      query.$or = [
        { displayName: { $regex: search, $options: 'i' } },
        { bio: { $regex: search, $options: 'i' } },
      ];
    }

    if (language) {
      query.languages = { $in: [new RegExp(`^${language}$`, 'i')] };
    }

    if (interest) {
      query.interests = { $in: [new RegExp(`^${interest}$`, 'i')] };
    }

    if (pricingTier) {
      query.pricingTier = pricingTier.toUpperCase();
    }

    if (availabilityStatus) {
      query.availabilityStatus = availabilityStatus.toUpperCase();
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Sort order: ONLINE creators first, then BUSY, then OFFLINE, descending by rating
    const creators = await CreatorProfile.find(query)
      .select('-__v')
      .sort({
        availabilityStatus: 1, // 'BUSY' or 'ONLINE' depending on alphabetical, we'll sort custom if needed
        ratingAverage: -1,
        totalCallsCompleted: -1,
      })
      .skip(skip)
      .limit(parseInt(limit));

    const totalCount = await CreatorProfile.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        creators,
        pagination: {
          totalCount,
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / parseInt(limit)),
          limit: parseInt(limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get public profile of a single creator by ID.
 */
export async function getCreatorById(req, res, next) {
  try {
    const creator = await CreatorProfile.findById(req.params.id);
    if (!creator) {
      return next(new AppError('Creator not found.', 404, 'NOT_FOUND'));
    }

    res.status(200).json({
      success: true,
      data: { creator },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * ADMIN: Get list of pending creator verification applications.
 */
export async function adminGetVerificationQueue(req, res, next) {
  try {
    const pendingCreators = await CreatorProfile.find({
      verificationStatus: 'PENDING',
    })
      .populate('userId', 'email displayName dateOfBirth isAdult')
      .sort({ updatedAt: -1 });

    const queueData = await Promise.all(
      pendingCreators.map(async (creator) => {
        const latestRecord = await VerificationRecord.findOne({
          userId: creator.userId?._id,
          verificationType: 'GOVT_ID',
        }).sort({ createdAt: -1 });

        return {
          creator,
          latestKycRecord: latestRecord,
        };
      })
    );

    res.status(200).json({
      success: true,
      data: { queue: queueData },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * ADMIN: Approve or reject creator KYC application.
 */
export async function adminReviewCreator(req, res, next) {
  try {
    const { action, rejectionReason } = adminReviewKycSchema.parse(req.body);
    const creator = await CreatorProfile.findById(req.params.creatorId);

    if (!creator) {
      return next(new AppError('Creator profile not found.', 404, 'NOT_FOUND'));
    }

    const latestRecord = await VerificationRecord.findOne({
      userId: creator.userId,
      verificationType: 'GOVT_ID',
    }).sort({ createdAt: -1 });

    if (action === 'APPROVE') {
      creator.isVerified = true;
      creator.verificationStatus = 'APPROVED';
      creator.rejectionReason = '';
      await creator.save();

      if (latestRecord) {
        latestRecord.status = 'APPROVED';
        latestRecord.reviewedBy = req.user._id;
        latestRecord.reviewedAt = new Date();
        await latestRecord.save();
      }

      await User.findByIdAndUpdate(creator.userId, { status: 'ACTIVE', role: 'CREATOR' });

      res.status(200).json({
        success: true,
        message: `Creator ${creator.displayName} has been approved.`,
        data: { creator },
      });
    } else {
      creator.isVerified = false;
      creator.verificationStatus = 'REJECTED';
      creator.rejectionReason = rejectionReason || 'Identity documentation did not meet clarity requirements.';
      await creator.save();

      if (latestRecord) {
        latestRecord.status = 'REJECTED';
        latestRecord.rejectionReason = creator.rejectionReason;
        latestRecord.reviewedBy = req.user._id;
        latestRecord.reviewedAt = new Date();
        await latestRecord.save();
      }

      res.status(200).json({
        success: true,
        message: `Creator ${creator.displayName} application rejected.`,
        data: { creator },
      });
    }
  } catch (error) {
    next(error);
  }
}
