import { SystemStats } from '../models/SystemStats.js';
import { NetworkActivity } from '../models/NetworkActivity.js';
import { FirewallRule } from '../models/FirewallRule.js';
import { logger } from '../utils/logger.js';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

class DataCollectionService {
  constructor() {
    this.isCollecting = false;
    this.collectionInterval = null;
    this.activityInterval = null;
  }

  // Sistem durumunu sürekli topla ve MongoDB'ye kaydet
  async startDataCollection() {
    if (this.isCollecting) {
      logger.info('Veri toplama zaten çalışıyor');
      return;
    }

    this.isCollecting = true;
    logger.info('🔄 Kalıcı veri toplama sistemi başlatıldı');

    // Her 5 dakikada bir sistem istatistiklerini kaydet
    this.collectionInterval = setInterval(async () => {
      await this.collectSystemStats();
    }, 5 * 60 * 1000); // 5 dakika

    // Her 30 saniyede bir network activity simüle et (gerçek sistemde bu gerçek trafik olacak)
    this.activityInterval = setInterval(async () => {
      await this.collectNetworkActivity();
    }, 30 * 1000); // 30 saniye

    // İlk veri toplamayı hemen başlat
    await this.collectSystemStats();
    await this.initializeDefaultData();
  }

  async stopDataCollection() {
    if (!this.isCollecting) return;

    this.isCollecting = false;

    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
    }

    if (this.activityInterval) {
      clearInterval(this.activityInterval);
      this.activityInterval = null;
    }

    logger.info('⏹️  Veri toplama sistemi durduruldu');
  }

  // Sistem istatistiklerini topla ve kaydet
  async collectSystemStats() {
    try {
      const connectedDevices = await this.getConnectedDevices();
      const activeRulesCount = await FirewallRule.countDocuments({ isActive: true });

      // Son 1 saatteki aktiviteleri say
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const [totalConnections, blockedConnections, threats] = await Promise.all([
        NetworkActivity.countDocuments({ timestamp: { $gte: oneHourAgo } }),
        NetworkActivity.countDocuments({
          timestamp: { $gte: oneHourAgo },
          action: 'blocked'
        }),
        NetworkActivity.countDocuments({
          timestamp: { $gte: oneHourAgo },
          'threat.detected': true
        })
      ]);

      // Sistem istatistiklerini oluştur
      const systemStats = new SystemStats({
        totalConnections,
        blockedConnections,
        allowedConnections: totalConnections - blockedConnections,
        threats,
        activeRules: activeRulesCount,
        connectedDevices: connectedDevices.map(device => ({
          ip: device.ip,
          mac: device.mac,
          hostname: device.hostname,
          lastSeen: device.lastSeen,
          status: device.status
        })),
        networkActivity: await this.getHourlyActivity(),
        systemStatus: {
          firewallActive: true,
          lastUpdate: new Date(),
          uptime: os.uptime()
        }
      });

      await systemStats.save();
      logger.info(`📊 Sistem istatistikleri kaydedildi: ${totalConnections} bağlantı, ${blockedConnections} engelleme`);

    } catch (error) {
      logger.error('Sistem istatistikleri toplama hatası:', error);
    }
  }

  // Network aktivitesi simüle et ve kaydet
  async collectNetworkActivity() {
    try {
      // Gerçek sistemde bu gerçek network trafiğinden gelecek
      // Şimdilik simülasyon yapıyoruz
      const shouldCreateActivity = Math.random() > 0.3; // %70 ihtimalle aktivite oluştur

      if (!shouldCreateActivity) return;

      const domains = [
        'google.com', 'microsoft.com', 'github.com', 'stackoverflow.com', 'aws.amazon.com',
        'malicious-site.com', 'phishing-domain.net', 'suspicious-activity.org', 'threat-source.com'
      ];

      const sourceIPs = [
        '192.168.1.10', '192.168.1.15', '192.168.1.20', '192.168.1.25', '192.168.1.30',
        '10.0.0.5', '10.0.0.8', '10.0.0.12', '172.16.0.5', '172.16.0.10'
      ];

      const domain = domains[Math.floor(Math.random() * domains.length)];
      const sourceIp = sourceIPs[Math.floor(Math.random() * sourceIPs.length)];

      // Kötü amaçlı domain kontrolü
      const isMalicious = domain.includes('malicious') || domain.includes('phishing') ||
                         domain.includes('suspicious') || domain.includes('threat');

      const isBlocked = isMalicious || Math.random() > 0.85; // Kötü amaçlı siteler + %15 rastgele engelleme
      const hasThreat = isBlocked && Math.random() > 0.6; // Engellenen trafiğin %40'ında tehdit

      const activity = new NetworkActivity({
        sourceIp: sourceIp,
        destinationIp: `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        domain: domain,
        port: this.getRandomPort(),
        protocol: ['TCP', 'UDP', 'ICMP'][Math.floor(Math.random() * 3)],
        action: isBlocked ? 'blocked' : 'allowed',
        ruleId: `rule_${Math.floor(Math.random() * 10) + 1}`,
        reason: isBlocked ? 'Security policy violation' : 'Traffic allowed by policy',
        bytesTransferred: Math.floor(Math.random() * 50000) + 1000,
        threat: {
          detected: hasThreat,
          type: hasThreat ? this.getThreatType() : 'none',
          severity: hasThreat ? this.getThreatSeverity() : 'low'
        }
      });

      await activity.save();

      // Kritik tehditler için log
      if (hasThreat && activity.threat.severity === 'critical') {
        logger.warn(`🚨 Kritik tehdit tespit edildi: ${domain} -> ${sourceIp}`);
      }

    } catch (error) {
      logger.error('Network aktivitesi kaydetme hatası:', error);
    }
  }

  // İlk kurulumda varsayılan veriler oluştur
  async initializeDefaultData() {
    try {
      // Eğer hiç sistem istatistiği yoksa, varsayılan oluştur
      const existingStats = await SystemStats.countDocuments();
      if (existingStats === 0) {
        logger.info('💾 İlk kurulum: Varsayılan sistem verileri oluşturuluyor...');

        // Son 24 saat için saatlik veri oluştur
        for (let i = 23; i >= 0; i--) {
          const timestamp = new Date(Date.now() - i * 60 * 60 * 1000);
          const totalConnections = Math.floor(Math.random() * 500) + 100;
          const blockedConnections = Math.floor(totalConnections * (Math.random() * 0.2 + 0.05));

          const stats = new SystemStats({
            timestamp,
            totalConnections,
            blockedConnections,
            allowedConnections: totalConnections - blockedConnections,
            threats: Math.floor(blockedConnections * 0.1),
            activeRules: 12,
            connectedDevices: await this.getConnectedDevices(),
            systemStatus: {
              firewallActive: true,
              lastUpdate: timestamp,
              uptime: os.uptime()
            }
          });

          await stats.save();
        }

        // Örnek network aktiviteleri oluştur
        await this.createSampleNetworkActivities();

        logger.info('✅ Varsayılan sistem verileri oluşturuldu');
      }

      // Varsayılan firewall kuralları oluştur
      await this.initializeFirewallRules();

    } catch (error) {
      logger.error('Varsayılan veri oluşturma hatası:', error);
    }
  }

  // Örnek network aktiviteleri oluştur (ilk kurulum için)
  async createSampleNetworkActivities() {
    const sampleActivities = [];
    const now = new Date();

    for (let i = 0; i < 50; i++) {
      const timestamp = new Date(now.getTime() - Math.random() * 24 * 60 * 60 * 1000); // Son 24 saat içinde
      const isBlocked = Math.random() > 0.8;
      const hasThreat = isBlocked && Math.random() > 0.7;

      sampleActivities.push({
        timestamp,
        sourceIp: `192.168.1.${Math.floor(Math.random() * 50) + 10}`,
        destinationIp: `8.8.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        domain: this.getRandomDomain(),
        port: this.getRandomPort(),
        protocol: ['TCP', 'UDP'][Math.floor(Math.random() * 2)],
        action: isBlocked ? 'blocked' : 'allowed',
        ruleId: `rule_${Math.floor(Math.random() * 10) + 1}`,
        reason: isBlocked ? 'Security policy violation' : 'Traffic allowed',
        bytesTransferred: Math.floor(Math.random() * 10000) + 500,
        threat: {
          detected: hasThreat,
          type: hasThreat ? this.getThreatType() : 'none',
          severity: hasThreat ? this.getThreatSeverity() : 'low'
        }
      });
    }

    await NetworkActivity.insertMany(sampleActivities);
    logger.info(`📝 ${sampleActivities.length} örnek network aktivitesi oluşturuldu`);
  }

  // Varsayılan firewall kuralları oluştur
  async initializeFirewallRules() {
    try {
      const existingRules = await FirewallRule.countDocuments();
      if (existingRules > 0) return;

      // Sistem kullanıcısı ID'si (admin)
      const adminUser = await import('../models/User.js').then(module => module.User);
      const admin = await adminUser.findOne({ role: 'admin' });

      if (!admin) {
        logger.warn('Admin kullanıcısı bulunamadı, firewall kuralları oluşturulamadı');
        return;
      }

      const defaultRules = [
        {
          name: 'Allow HTTP Traffic',
          description: 'HTTP web trafiğine izin ver (port 80)',
          isActive: true,
          priority: 10,
          destination: { port: '80' },
          protocol: 'TCP',
          action: 'allow',
          createdBy: admin._id
        },
        {
          name: 'Allow HTTPS Traffic',
          description: 'HTTPS güvenli web trafiğine izin ver (port 443)',
          isActive: true,
          priority: 20,
          destination: { port: '443' },
          protocol: 'TCP',
          action: 'allow',
          createdBy: admin._id
        },
        {
          name: 'Block Malware Domains',
          description: 'Bilinen kötü amaçlı domain\'leri engelle',
          isActive: true,
          priority: 5,
          source: { ip: 'any' },
          action: 'block',
          createdBy: admin._id
        },
        {
          name: 'Allow DNS Queries',
          description: 'DNS sorgularına izin ver (port 53)',
          isActive: true,
          priority: 15,
          destination: { port: '53' },
          protocol: 'UDP',
          action: 'allow',
          createdBy: admin._id
        },
        {
          name: 'Block External SSH',
          description: 'Dış ağdan SSH bağlantılarını engelle (port 22)',
          isActive: true,
          priority: 30,
          destination: { port: '22' },
          protocol: 'TCP',
          action: 'block',
          createdBy: admin._id
        },
        {
          name: 'Allow FTP',
          description: 'FTP trafiğine izin ver (port 21)',
          isActive: false,
          priority: 40,
          destination: { port: '21' },
          protocol: 'TCP',
          action: 'allow',
          createdBy: admin._id
        },
        {
          name: 'Block P2P Traffic',
          description: 'BitTorrent ve P2P trafiğini engelle',
          isActive: true,
          priority: 25,
          destination: { port: '6881-6889' },
          protocol: 'TCP',
          action: 'block',
          createdBy: admin._id
        },
        {
          name: 'Allow Email SMTP',
          description: 'Email gönderimi için SMTP\'ye izin ver (port 587)',
          isActive: true,
          priority: 35,
          destination: { port: '587' },
          protocol: 'TCP',
          action: 'allow',
          createdBy: admin._id
        },
        {
          name: 'Allow Email IMAP',
          description: 'Email alımı için IMAP\'a izin ver (port 993)',
          isActive: true,
          priority: 36,
          destination: { port: '993' },
          protocol: 'TCP',
          action: 'allow',
          createdBy: admin._id
        },
        {
          name: 'Block Suspicious IPs',
          description: 'Şüpheli IP adreslerini engelle',
          isActive: true,
          priority: 3,
          source: { subnet: '10.0.0.0/8' },
          action: 'block',
          createdBy: admin._id
        },
        {
          name: 'Allow NTP',
          description: 'Zaman senkronizasyonu için NTP\'ye izin ver (port 123)',
          isActive: true,
          priority: 45,
          destination: { port: '123' },
          protocol: 'UDP',
          action: 'allow',
          createdBy: admin._id
        },
        {
          name: 'Block High Risk Ports',
          description: 'Yüksek riskli portları engelle',
          isActive: true,
          priority: 8,
          destination: { port: '1433,3389,5900' },
          protocol: 'TCP',
          action: 'block',
          createdBy: admin._id
        }
      ];

      await FirewallRule.insertMany(defaultRules);
      logger.info(`🛡️  ${defaultRules.length} varsayılan firewall kuralı oluşturuldu`);

    } catch (error) {
      logger.error('Varsayılan firewall kuralları oluşturma hatası:', error);
    }
  }

  // Helper methods
  async getConnectedDevices() {
    try {
      // Gerçek sistemde arp table veya DHCP lease'lerinden alınacak
      return [
        { ip: '192.168.1.10', mac: '00:11:22:33:44:55', hostname: 'admin-laptop', lastSeen: new Date(), status: 'active' },
        { ip: '192.168.1.15', mac: '00:11:22:33:44:56', hostname: 'server-001', lastSeen: new Date(), status: 'active' },
        { ip: '192.168.1.20', mac: '00:11:22:33:44:57', hostname: 'workstation-02', lastSeen: new Date(), status: 'active' },
        { ip: '192.168.1.25', mac: '00:11:22:33:44:58', hostname: 'mobile-device', lastSeen: new Date(), status: 'active' },
        { ip: '10.0.0.5', mac: '00:11:22:33:44:59', hostname: 'printer-hp', lastSeen: new Date(), status: 'active' }
      ];
    } catch (error) {
      logger.error('Bağlı cihazları alma hatası:', error);
      return [];
    }
  }

  async getHourlyActivity() {
    try {
      const now = new Date();
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const hourlyData = await NetworkActivity.aggregate([
        {
          $match: {
            timestamp: { $gte: last24Hours }
          }
        },
        {
          $group: {
            _id: { $hour: '$timestamp' },
            totalConnections: { $sum: 1 },
            blockedConnections: {
              $sum: { $cond: [{ $eq: ['$action', 'blocked'] }, 1, 0] }
            }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ]);

      return hourlyData.map(item => ({
        hour: item._id,
        totalConnections: item.totalConnections,
        blockedConnections: item.blockedConnections,
        timestamp: new Date()
      }));
    } catch (error) {
      logger.error('Saatlik aktivite verisi alma hatası:', error);
      return [];
    }
  }

  getRandomDomain() {
    const domains = [
      'google.com', 'microsoft.com', 'github.com', 'stackoverflow.com', 'netflix.com',
      'amazon.com', 'facebook.com', 'twitter.com', 'linkedin.com', 'youtube.com',
      'malware-site.com', 'phishing-domain.net', 'suspicious-activity.org'
    ];
    return domains[Math.floor(Math.random() * domains.length)];
  }

  getRandomPort() {
    const commonPorts = [80, 443, 22, 21, 25, 53, 110, 143, 993, 995, 587, 465, 8080, 8443, 3389, 5900];
    const useCommonPort = Math.random() > 0.3;

    if (useCommonPort) {
      return commonPorts[Math.floor(Math.random() * commonPorts.length)];
    } else {
      return Math.floor(Math.random() * 65535) + 1;
    }
  }

  getThreatType() {
    const types = ['malware', 'phishing', 'ddos', 'suspicious'];
    return types[Math.floor(Math.random() * types.length)];
  }

  getThreatSeverity() {
    const severities = ['low', 'medium', 'high', 'critical'];
    const weights = [0.4, 0.3, 0.2, 0.1]; // Düşük seviye daha olası

    const random = Math.random();
    let cumulative = 0;

    for (let i = 0; i < weights.length; i++) {
      cumulative += weights[i];
      if (random <= cumulative) {
        return severities[i];
      }
    }

    return 'low';
  }

  // Sistem durumunu al
  getSystemStatus() {
    return {
      isCollecting: this.isCollecting,
      uptime: os.uptime(),
      memory: process.memoryUsage(),
      platform: os.platform(),
      nodeVersion: process.version
    };
  }
}

// Singleton instance
const dataCollectionService = new DataCollectionService();

export default dataCollectionService;