import { verifyToken, COOKIE_NAME } from '../utils/token.js';
import { User } from '../models/User.js';
import { AppError } from './errorHandler.js';

export async function protect(req, res, next) {
  try {
    let token = null;

    // 1. Check HTTP-only cookie first
    if (req.cookies && req.cookies[COOKIE_NAME]) {
      token = req.cookies[COOKIE_NAME];
    }
    // 2. Fallback to Bearer token in Authorization header
    else if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(
        new AppError('Authentication required. Please log in.', 401, 'UNAUTHORIZED')
      );
    }

    // Verify token
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      return next(
        new AppError('Invalid or expired authentication session.', 401, 'INVALID_TOKEN')
      );
    }

    // Find user
    const user = await User.findById(decoded.id);
    if (!user) {
      return next(
        new AppError('User belonging to this token no longer exists.', 401, 'USER_NOT_FOUND')
      );
    }

    // Check account status
    if (user.status === 'BANNED' || user.status === 'SUSPENDED') {
      return next(
        new AppError(
          `Account is ${user.status.toLowerCase()}. Please contact safety and compliance.`,
          403,
          'ACCOUNT_RESTRICTED'
        )
      );
    }

    // Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

export async function optionalProtect(req, res, next) {
  try {
    let token = null;
    if (req.cookies && req.cookies[COOKIE_NAME]) {
      token = req.cookies[COOKIE_NAME];
    } else if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next();
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      return next(
        new AppError('Invalid or expired authentication session.', 401, 'INVALID_TOKEN')
      );
    }

    const user = await User.findById(decoded.id);
    if (user && user.status !== 'BANNED' && user.status !== 'SUSPENDED') {
      req.user = user;
    }
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Restricts access to specified roles (e.g. 'ADMIN', 'CREATOR', 'CUSTOMER').
 */
export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(
        new AppError(
          `Forbidden: Role '${req.user?.role || 'NONE'}' is not authorized to access this resource.`,
          403,
          'FORBIDDEN_ROLE'
        )
      );
    }
    next();
  };
}

/**
 * Ensures user has verified 18+ adult eligibility before entering calls or sensitive actions.
 */
export function requireAdult(req, res, next) {
  if (!req.user || !req.user.isAdult) {
    return next(
      new AppError(
        'Adult verification required. You must be at least 18 years old to access this feature.',
        403,
        'UNDERAGE_RESTRICTED'
      )
    );
  }
  next();
}
