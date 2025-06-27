import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { logger } from '../utils/logger.js';

// JWT Authentication middleware
export const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token bulunamadı. Erişim reddedildi.'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key-change-in-production');

    // Handle hardcoded admin user
    if (decoded.userId === 'admin-user-id') {
      req.user = {
        userId: 'admin-user-id',
        role: 'admin',
        username: 'admin'
      };
      return next();
    }

    // Try to find user in database
    try {
      const user = await User.findById(decoded.userId);
      if (!user || !user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Kullanıcı bulunamadı veya aktif değil'
        });
      }

      req.user = {
        userId: user._id,
        role: user.role,
        username: user.username
      };
    } catch (dbError) {
      console.log('⚠️ Database error in auth middleware:', dbError.message);
      // If database is down but token is valid, allow hardcoded admin
      if (decoded.userId === 'admin-user-id') {
        req.user = {
          userId: 'admin-user-id',
          role: 'admin',
          username: 'admin'
        };
      } else {
        return res.status(401).json({
          success: false,
          message: 'Veritabanı bağlantı hatası'
        });
      }
    }

    next();
  } catch (error) {
    logger.error('Auth middleware hatası:', error);

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token süresi dolmuş'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Geçersiz token'
      });
    }

    res.status(401).json({
      success: false,
      message: 'Token doğrulanamadı'
    });
  }
};