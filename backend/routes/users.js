import express from 'express';
import { body, validationResult } from 'express-validator';
import { User } from '../models/User.js';
import { auth, authorize } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// @route   GET /api/users/profile
// @desc    Get current user profile
// @access  Private
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error('Profil getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Profil bilgileri alınamadı'
    });
  }
});

// @route   PUT /api/users/profile
// @desc    Update current user profile
// @access  Private
router.put('/profile', auth, [
  body('profile.firstName').optional().trim().isLength({ min: 2 }).withMessage('Ad en az 2 karakter olmalı'),
  body('profile.lastName').optional().trim().isLength({ min: 2 }).withMessage('Soyad en az 2 karakter olmalı'),
  body('profile.phone').optional().isMobilePhone('tr-TR').withMessage('Geçerli bir telefon numarası girin'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz veriler',
        errors: errors.array()
      });
    }

    const { profile, preferences } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      {
        $set: {
          ...(profile && { profile }),
          ...(preferences && { preferences })
        }
      },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    logger.info(`Profil güncellendi: ${user.username} - IP: ${req.ip}`);

    res.json({
      success: true,
      message: 'Profil başarıyla güncellendi',
      data: user
    });
  } catch (error) {
    logger.error('Profil güncelleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Profil güncellenirken bir hata oluştu'
    });
  }
});

// @route   GET /api/users
// @desc    Get all users (Admin only)
// @access  Private/Admin
router.get('/', auth, authorize('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 10, search, role, isActive } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { 'profile.firstName': { $regex: search, $options: 'i' } },
        { 'profile.lastName': { $regex: search, $options: 'i' } }
      ];
    }

    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const users = await User.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Kullanıcı listesi hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcı listesi alınamadı'
    });
  }
});

export default router;