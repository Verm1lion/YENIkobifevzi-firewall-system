const express = require('express');
const router = express.Router();

// Get security status
router.get('/status', async (req, res) => {
  try {
    const securityStatus = {
      firewall: 'Aktif',
      ssl: 'Güncel',
      lastScan: '2 saat önce'
    };

    res.json(securityStatus);
  } catch (error) {
    console.error('Error fetching security status:', error);
    res.status(500).json({ error: 'Güvenlik durumu alınırken hata oluştu' });
  }
});

module.exports = router;