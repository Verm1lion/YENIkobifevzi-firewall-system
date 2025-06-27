const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Mock settings data
let settings = {
  timezone: 'Türkiye (UTC+3)',
  language: 'Türkçe',
  sessionTimeout: '60',
  logLevel: 'Info (Normal)',
  autoUpdates: true,
  systemNotifications: true,
  darkTheme: true,
  backupFrequency: 'Haftalık',
  backupLocation: '/opt/firewall/backups'
};

// Get current settings
router.get('/', async (req, res) => {
  try {
    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Ayarlar alınırken hata oluştu' });
  }
});

// Update settings
router.put('/', async (req, res) => {
  try {
    settings = { ...settings, ...req.body };

    // Apply system changes
    await applySystemSettings(settings);

    res.json(settings);
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Ayarlar güncellenirken hata oluştu' });
  }
});

async function applySystemSettings(settings) {
  try {
    // Apply timezone
    if (settings.timezone) {
      console.log(`Setting timezone: ${settings.timezone}`);
      // await execAsync(`timedatectl set-timezone Europe/Istanbul`);
    }

    // Apply other settings
    console.log('Settings applied successfully');
  } catch (error) {
    console.error('Error applying settings:', error);
    throw error;
  }
}

module.exports = router;