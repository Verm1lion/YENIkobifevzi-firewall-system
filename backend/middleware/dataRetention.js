import { SystemStats } from '../models/SystemStats.js';
import { NetworkActivity } from '../models/NetworkActivity.js';
import { logger } from '../utils/logger.js';
import cron from 'node-cron';

class DataRetentionService {
  constructor() {
    this.isRunning = false;
  }

  // Veri saklama politikalarını başlat
  startRetentionPolicies() {
    if (this.isRunning) return;

    this.isRunning = true;
    logger.info('📅 Veri saklama politikaları başlatıldı');

    // Her gün gece 02:00'da eski verileri temizle
    cron.schedule('0 2 * * *', async () => {
      await this.cleanupOldData();
    }, {
      timezone: 'Europe/Istanbul'
    });

    // Her hafta pazar günü 03:00'da istatistikleri arşivle
    cron.schedule('0 3 * * 0', async () => {
      await this.archiveOldStats();
    }, {
      timezone: 'Europe/Istanbul'
    });

    // Her saat başı sistem sağlığını kontrol et
    cron.schedule('0 * * * *', async () => {
      await this.performHealthCheck();
    }, {
      timezone: 'Europe/Istanbul'
    });
  }

  // Eski verileri temizle
  async cleanupOldData() {
    try {
      logger.info('🧹 Eski veriler temizleniyor...');

      const now = new Date();

      // 30 günden eski network aktivitelerini sil
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const deletedActivities = await NetworkActivity.deleteMany({
        timestamp: { $lt: thirtyDaysAgo }
      });

      // 90 günden eski sistem istatistiklerini sil
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      const deletedStats = await SystemStats.deleteMany({
        timestamp: { $lt: ninetyDaysAgo }
      });

      logger.info(`✅ Temizlik tamamlandı: ${deletedActivities.deletedCount} aktivite, ${deletedStats.deletedCount} istatistik silindi`);

    } catch (error) {
      logger.error('Veri temizleme hatası:', error);
    }
  }

  // Eski istatistikleri arşivle (opsiyonel)
  async archiveOldStats() {
    try {
      logger.info('📦 Eski veriler arşivleniyor...');

      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Son 7 günden eski verileri summary olarak sakla
      const oldStats = await SystemStats.aggregate([
        {
          $match: {
            timestamp: { $lt: sevenDaysAgo }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$timestamp' },
              month: { $month: '$timestamp' },
              day: { $dayOfMonth: '$timestamp' }
            },
            totalConnections: { $sum: '$totalConnections' },
            blockedConnections: { $sum: '$blockedConnections' },
            threats: { $sum: '$threats' },
            count: { $sum: 1 }
          }
        }
      ]);

      if (oldStats.length > 0) {
        logger.info(`📊 ${oldStats.length} günlük veri arşivlendi`);
      }

    } catch (error) {
      logger.error('Veri arşivleme hatası:', error);
    }
  }

  // Sistem sağlık kontrolü
  async performHealthCheck() {
    try {
      // Veritabanı bağlantısını kontrol et
      const dbStats = await SystemStats.collection.stats();
      const activityStats = await NetworkActivity.collection.stats();

      // Memory kullanımını kontrol et
      const memoryUsage = process.memoryUsage();
      const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

      // Kritik durum kontrolü
      if (memoryUsagePercent > 90) {
        logger.warn(`⚠️  Yüksek memory kullanımı: %${memoryUsagePercent.toFixed(1)}`);
      }

      // Veritabanı boyutu kontrolü
      const totalSize = dbStats.size + activityStats.size;
      const totalSizeMB = totalSize / (1024 * 1024);

      if (totalSizeMB > 1000) { // 1GB
        logger.warn(`⚠️  Veritabanı boyutu büyük: ${totalSizeMB.toFixed(1)} MB`);
      }

      logger.info(`💚 Sistem sağlık kontrolü tamamlandı - Memory: %${memoryUsagePercent.toFixed(1)}, DB: ${totalSizeMB.toFixed(1)} MB`);

    } catch (error) {
      logger.error('Sistem sağlık kontrolü hatası:', error);
    }
  }

  // Manuel temizlik
  async performManualCleanup(days = 30) {
    try {
      const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const deletedActivities = await NetworkActivity.deleteMany({
        timestamp: { $lt: cutoffDate }
      });

      const deletedStats = await SystemStats.deleteMany({
        timestamp: { $lt: cutoffDate }
      });

      logger.info(`🧹 Manuel temizlik: ${deletedActivities.deletedCount} aktivite, ${deletedStats.deletedCount} istatistik silindi`);

      return {
        deletedActivities: deletedActivities.deletedCount,
        deletedStats: deletedStats.deletedCount
      };

    } catch (error) {
      logger.error('Manuel temizlik hatası:', error);
      throw error;
    }
  }

  // Veri saklama politikalarını durdur
  stopRetentionPolicies() {
    this.isRunning = false;
    logger.info('📅 Veri saklama politikaları durduruldu');
  }
}

const dataRetentionService = new DataRetentionService();

export default dataRetentionService;