import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const COOKIE_NAME = 'spotizan_token';

/**
 * Generates a signed JWT token containing user id, role, and adult verification state.
 */
export function generateToken(user) {
  return jwt.sign(
    {
      id: user._id.toString(),
      role: user.role,
      isAdult: user.isAdult,
    },
    env.JWT_SECRET,
    {
      expiresIn: '7d',
    }
  );
}

/**
 * Sets an HTTP-only secure cookie with the JWT token.
 */
export function setAuthCookie(res, token) {
  const isProduction = env.NODE_ENV === 'production';

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction, // HTTPS in production
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  });
}

/**
 * Clears the authentication cookie upon logout.
 */
export function clearAuthCookie(res) {
  const isProduction = env.NODE_ENV === 'production';

  res.cookie(COOKIE_NAME, '', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    expires: new Date(0),
    path: '/',
  });
}

/**
 * Verifies JWT token and returns decoded payload.
 */
export function verifyToken(token) {
  return jwt.verify(token, env.JWT_SECRET);
}
