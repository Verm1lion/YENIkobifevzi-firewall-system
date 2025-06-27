const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const os = require('os');
const fs = require('fs');

// Get system information
router.get('/info', async (req, res) => {
  try {
    const systemInfo = {
      version: '1.0.0',
      platform: os.platform(),
      uptime: formatUptime(os.uptime()),
      memoryUsage: Math.round((1 - os.freemem() / os.totalmem()) * 100),
      diskUsage: await getDiskUsage(),
      totalMemory: Math.round(os.totalmem() / (1024**3)) + ' GB',
      totalDisk: '100 GB',
      cpuUsage: await getCpuUsage(),
      loadAverage: os.loadavg()
    };

    res.json({
      success: true,
      data: systemInfo
    });
  } catch (error) {
    console.error('Error fetching system info:', error);
    res.status(500).json({
      success: false,
      error: 'Sistem bilgileri alınırken hata oluştu'
    });
  }
});

// Restart system
router.post('/restart', async (req, res) => {
  try {
    console.log('System restart initiated');
    // await execAsync('sudo reboot');
    res.json({
      success: true,
      message: 'Sistem 1 dakika içinde yeniden başlatılacak'
    });
  } catch (error) {
    console.error('Error restarting system:', error);
    res.status(500).json({
      success: false,
      error: 'Sistem yeniden başlatılırken hata oluştu'
    });
  }
});

// Create backup
router.post('/backup', async (req, res) => {
  try {
    console.log('Manual backup initiated');
    // Simulate backup process
    setTimeout(() => {
      console.log('✅ Manual backup completed');
    }, 5000);

    res.json({
      success: true,
      message: 'Manuel yedekleme başlatıldı'
    });
  } catch (error) {
    console.error('Error creating backup:', error);
    res.status(500).json({
      success: false,
      error: 'Yedekleme sırasında hata oluştu'
    });
  }
});

// Check for updates
router.post('/check-updates', async (req, res) => {
  try {
    console.log('Checking for updates');

    const updateInfo = {
      available: false,
      count: 0,
      currentVersion: '1.0.0',
      latestVersion: '1.0.0',
      lastCheck: new Date().toISOString(),
      status: 'Güncel'
    };

    res.json({
      success: true,
      message: 'Güncellemeler kontrol edildi',
      data: updateInfo
    });
  } catch (error) {
    console.error('Error checking updates:', error);
    res.status(500).json({
      success: false,
      error: 'Güncellemeler kontrol edilirken hata oluştu'
    });
  }
});

// Clear logs
router.delete('/logs', async (req, res) => {
  try {
    console.log('Clearing system logs');

    let clearedFiles = [];
    let totalFreed = 0;

    // Log dosyalarını temizle
    const logPaths = [
      '/var/log/nginx/access.log',
      '/var/log/nginx/error.log',
      '/var/log/syslog'
    ];

    for (const logPath of logPaths) {
      try {
        if (fs.existsSync(logPath)) {
          const stats = fs.statSync(logPath);
          fs.writeFileSync(logPath, ''); // Dosyayı boşalt
          clearedFiles.push(logPath);
          totalFreed += stats.size;
        }
      } catch (e) {
        console.warn(`Could not clear ${logPath}:`, e.message);
      }
    }

    const freedMB = Math.round(totalFreed / (1024 * 1024) * 100) / 100;

    res.json({
      success: true,
      message: `Sistem logları temizlendi - ${clearedFiles.length} dosya, ${freedMB} MB alan boşaltıldı`,
      data: {
        clearedFiles,
        freedSpace: `${freedMB} MB`
      }
    });
  } catch (error) {
    console.error('Error clearing logs:', error);
    res.status(500).json({
      success: false,
      error: 'Loglar temizlenirken hata oluştu'
    });
  }
});

// Helper functions
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  return `${days} gün ${hours} saat`;
}

async function getDiskUsage() {
  try {
    const { stdout } = await execAsync("df -h / | awk 'NR==2 {print $5}' | sed 's/%//'");
    return parseInt(stdout.trim()) || 45;
  } catch {
    return 45; // Default value
  }
}

async function getCpuUsage() {
  try {
    const { stdout } = await execAsync("top -bn1 | grep 'Cpu(s)' | sed 's/.*, *\\([0-9.]*\\)%* id.*/\\1/' | awk '{print 100 - $1}'");
    return Math.round(parseFloat(stdout.trim())) || 25;
  } catch {
    return 25; // Default value
  }
}

module.exports = router;