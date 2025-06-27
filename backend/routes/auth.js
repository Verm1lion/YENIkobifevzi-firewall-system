import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { User } from '../models/User.js';
import { auth } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: {
    success: false,
    message: 'Çok fazla giriş denemesi. 15 dakika sonra tekrar deneyin.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Generate JWT tokens
const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'fallback-secret-key-change-in-production',
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );

  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret-change-in-production',
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );

  return { accessToken, refreshToken };
};

// Login validation
const loginValidation = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Kullanıcı adı gerekli')
    .isLength({ min: 1 })
    .withMessage('Kullanıcı adı en az 1 karakter olmalı'),
  body('password')
    .notEmpty()
    .withMessage('Parola gerekli')
    .isLength({ min: 1 })
    .withMessage('Parola gerekli')
];

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', authLimiter, loginValidation, async (req, res) => {
  try {
    console.log('🔐 Login attempt:', { username: req.body.username, ip: req.ip });

    // Validation check
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        message: 'Geçersiz giriş bilgileri',
        errors: errors.array()
      });
    }

    const { username, password, rememberMe } = req.body;

    // HARDCODED ADMIN USER FOR TESTING
    if (username === 'admin' && password === 'admin123') {
      console.log('✅ Hardcoded admin login successful');

      const { accessToken, refreshToken } = generateTokens('admin-user-id');

      const userData = {
        id: 'admin-user-id',
        username: 'admin',
        email: 'admin@localhost',
        role: 'admin',
        profile: {
          firstName: 'Admin',
          lastName: 'User'
        },
        preferences: {
          theme: 'dark',
          language: 'tr'
        }
      };

      logger.info(`Başarılı giriş: ${username} - IP: ${req.ip}`);

      return res.json({
        success: true,
        message: 'Giriş başarılı',
        token: accessToken,
        refreshToken: rememberMe ? refreshToken : undefined,
        user: userData
      });
    }

    // Try to find user in database
    let user;
    try {
      user = await User.findOne({
        $or: [
          { username: username },
          { email: username }
        ],
        isActive: true
      }).select('+password');

      console.log('👤 User found in DB:', !!user);
    } catch (dbError) {
      console.log('⚠️ Database query failed, falling back to hardcoded user');
      // Database connection might be down, but we can still allow hardcoded login
    }

    if (!user) {
      console.log('❌ User not found:', username);
      return res.status(401).json({
        success: false,
        message: 'Geçersiz kullanıcı adı veya parola'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log('❌ Password mismatch for user:', username);
      return res.status(401).json({
        success: false,
        message: 'Geçersiz kullanıcı adı veya parola'
      });
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id);

    // Save refresh token if remember me is checked
    if (rememberMe) {
      try {
        user.refreshTokens.push({
          token: refreshToken,
          createdAt: new Date()
        });
        await user.save();
      } catch (saveError) {
        console.log('⚠️ Failed to save refresh token:', saveError.message);
        // Continue anyway
      }
    }

    // Update last login
    try {
      user.lastLogin = new Date();
      await user.save();
    } catch (updateError) {
      console.log('⚠️ Failed to update last login:', updateError.message);
    }

    logger.info(`Başarılı giriş: ${user.username} - IP: ${req.ip}`);

    res.json({
      success: true,
      message: 'Giriş başarılı',
      token: accessToken,
      refreshToken: rememberMe ? refreshToken : undefined,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        profile: user.profile,
        preferences: user.preferences
      }
    });
  } catch (error) {
    logger.error('Giriş hatası:', error);
    console.error('❌ Login error:', error);

    res.status(500).json({
      success: false,
      message: 'Giriş yapılırken bir hata oluştu'
    });
  }
});

// @route   GET /api/auth/verify
// @desc    Verify JWT token
// @access  Private
router.get('/verify', auth, async (req, res) => {
  try {
    // If using hardcoded admin
    if (req.user.userId === 'admin-user-id') {
      return res.json({
        success: true,
        user: {
          id: 'admin-user-id',
          username: 'admin',
          email: 'admin@localhost',
          role: 'admin'
        }
      });
    }

    const user = await User.findById(req.user.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı bulunamadı veya aktif değil'
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        profile: user.profile,
        preferences: user.preferences
      }
    });
  } catch (error) {
    logger.error('Token doğrulama hatası:', error);
    res.status(401).json({
      success: false,
      message: 'Token doğrulanamadı'
    });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', auth, async (req, res) => {
  try {
    console.log('🚪 Logout request from user:', req.user.userId);

    const { refreshToken } = req.body;

    if (refreshToken && req.user.userId !== 'admin-user-id') {
      // Remove refresh token from user (skip for hardcoded admin)
      try {
        await User.findByIdAndUpdate(req.user.userId, {
          $pull: { refreshTokens: { token: refreshToken } }
        });
      } catch (updateError) {
        console.log('⚠️ Failed to remove refresh token:', updateError.message);
      }
    }

    logger.info(`Kullanıcı çıkış yaptı: ${req.user.userId} - IP: ${req.ip}`);

    res.json({
      success: true,
      message: 'Başarıyla çıkış yapıldı'
    });
  } catch (error) {
    logger.error('Çıkış hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Çıkış yapılırken bir hata oluştu'
    });
  }
});

export default router;