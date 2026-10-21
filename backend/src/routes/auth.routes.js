import { Router } from 'express';
import {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  verifyAge,
} from '../controllers/auth.controller.js';
import { protect, authorize, requireAdult } from '../middlewares/auth.js';

const router = Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);

// Protected routes
router.get('/me', protect, getMe);
router.patch('/profile', protect, updateProfile);
router.put('/profile', protect, updateProfile);
router.post('/verify-age', protect, verifyAge);

// Role test route for authorization validation
router.get('/admin-check', protect, authorize('ADMIN'), (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Authorized: Access granted to admin portal diagnostics.',
    admin: req.user.email,
  });
});

export default router;
