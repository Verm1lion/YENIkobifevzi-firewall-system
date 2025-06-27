const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Mock NAT settings
let natSettings = {
  enabled: false,
  wanInterface: '',
  lanInterface: ''
};

// Get NAT settings
router.get('/settings', async (req, res) => {
  try {
    res.json(natSettings);
  } catch (error) {
    console.error('Error fetching NAT settings:', error);
    res.status(500).json({ error: 'NAT ayarları alınırken hata oluştu' });
  }
});

// Update NAT settings
router.put('/settings', async (req, res) => {
  try {
    natSettings = { ...natSettings, ...req.body };

    // Apply NAT configuration
    await applyNatConfiguration(natSettings);

    res.json(natSettings);
  } catch (error) {
    console.error('Error updating NAT settings:', error);
    res.status(500).json({ error: 'NAT ayarları güncellenirken hata oluştu' });
  }
});

async function applyNatConfiguration(settings) {
  try {
    if (settings.enabled) {
      console.log(`Enabling NAT: WAN=${settings.wanInterface}, LAN=${settings.lanInterface}`);
      // Apply iptables rules for NAT
      // await execAsync(`iptables -t nat -A POSTROUTING -o ${settings.wanInterface} -j MASQUERADE`);
      // await execAsync(`iptables -A FORWARD -i ${settings.wanInterface} -o ${settings.lanInterface} -m state --state RELATED,ESTABLISHED -j ACCEPT`);
    } else {
      console.log('Disabling NAT');
      // Remove NAT rules
    }

    console.log('NAT configuration applied successfully');
  } catch (error) {
    console.error('Error applying NAT configuration:', error);
    throw error;
  }
}

module.exports = router;