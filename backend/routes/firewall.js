import express from 'express';
import { auth, authorize } from '../middleware/auth.js';
import { FirewallRule } from '../models/FirewallRule.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// @route   GET /api/firewall/rules
// @desc    Get all firewall rules
// @access  Private
router.get('/rules', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, active } = req.query;

    const query = {};
    if (active !== undefined) {
      query.isActive = active === 'true';
    }

    const rules = await FirewallRule.find(query)
      .populate('createdBy', 'username')
      .sort({ priority: 1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await FirewallRule.countDocuments(query);

    res.json({
      success: true,
      data: {
        rules,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    logger.error('Get firewall rules error:', error);
    res.status(500).json({
      success: false,
      message: 'Firewall kuralları alınamadı'
    });
  }
});

// @route   POST /api/firewall/rules
// @desc    Create firewall rule
// @access  Private (Admin only)
router.post('/rules', auth, authorize('admin'), async (req, res) => {
  try {
    const ruleData = {
      ...req.body,
      createdBy: req.user.userId
    };

    const rule = new FirewallRule(ruleData);
    await rule.save();

    logger.info(`Firewall kuralı oluşturuldu: ${rule.name} - ${req.user.username}`);

    res.status(201).json({
      success: true,
      message: 'Firewall kuralı başarıyla oluşturuldu',
      data: rule
    });

  } catch (error) {
    logger.error('Create firewall rule error:', error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Bu isimde bir kural zaten mevcut'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Firewall kuralı oluşturulamadı'
    });
  }
});

// Default rules oluşturma endpoint'i
router.post('/initialize-rules', auth, authorize('admin'), async (req, res) => {
  try {
    const existingRules = await FirewallRule.countDocuments();

    if (existingRules > 0) {
      return res.json({
        success: true,
        message: 'Kurallar zaten mevcut'
      });
    }

    const defaultRules = [
      {
        name: 'Allow HTTP',
        description: 'HTTP trafiğine izin ver',
        isActive: true,
        priority: 10,
        destination: { port: '80' },
        protocol: 'TCP',
        action: 'allow',
        createdBy: req.user.userId
      },
      {
        name: 'Allow HTTPS',
        description: 'HTTPS trafiğine izin ver',
        isActive: true,
        priority: 20,
        destination: { port: '443' },
        protocol: 'TCP',
        action: 'allow',
        createdBy: req.user.userId
      },
      {
        name: 'Block Malware Sites',
        description: 'Bilinen kötü amaçlı siteleri engelle',
        isActive: true,
        priority: 5,
        source: { ip: 'any' },
        action: 'block',
        createdBy: req.user.userId
      },
      {
        name: 'Allow DNS',
        description: 'DNS sorgularına izin ver',
        isActive: true,
        priority: 15,
        destination: { port: '53' },
        protocol: 'UDP',
        action: 'allow',
        createdBy: req.user.userId
      },
      {
        name: 'Block SSH External',
        description: 'Dış SSH bağlantılarını engelle',
        isActive: true,
        priority: 30,
        destination: { port: '22' },
        protocol: 'TCP',
        action: 'block',
        createdBy: req.user.userId
      }
    ];

    await FirewallRule.insertMany(defaultRules);

    res.json({
      success: true,
      message: `${defaultRules.length} varsayılan kural oluşturuldu`
    });

  } catch (error) {
    logger.error('Initialize rules error:', error);
    res.status(500).json({
      success: false,
      message: 'Varsayılan kurallar oluşturulamadı'
    });
  }
});

export default router;