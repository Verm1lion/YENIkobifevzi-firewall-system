const express = require('express');
const router = express.Router();

// Existing log routes...

// Clear logs
router.delete('/clear', async (req, res) => {
  try {
    console.log('Clearing logs');
    // Clear log files
    res.json({ message: 'Loglar temizlendi' });
  } catch (error) {
    console.error('Error clearing logs:', error);
    res.status(500).json({ error: 'Loglar temizlenirken hata oluştu' });
  }
});

module.exports = router;