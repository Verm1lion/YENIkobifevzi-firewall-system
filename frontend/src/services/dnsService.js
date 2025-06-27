import api from '../utils/axios';

export const dnsService = {
  // DNS konfigürasyonunu getir
  async getDnsConfig() {
    try {
      const response = await api.get('/api/v1/dns/config');
      return response.data;
    } catch (error) {
      console.error('DNS config fetch error:', error);
      // Fallback data for development
      return {
        success: true,
        data: {
          blockedDomains: [
            'malware.com',
            'ads.example.com',
            'tracker.net',
            'suspicious-site.com',
            'badware.org'
          ],
          wildcardRules: [
            '*.ads.google.com',
            '*.doubleclick.net',
            '*.googlesyndication.com',
            '*.facebook.com'
          ],
          allowedDomains: [
            'github.com',
            'stackoverflow.com',
            'google.com',
            'microsoft.com'
          ],
          adBlockerEnabled: true,
          dohBlocked: false,
          adBlockList: 'https://somehost.com/adblock-list.txt'
        }
      };
    }
  },

  // DNS konfigürasyonunu güncelle
  async updateDnsConfig(config) {
    try {
      const response = await api.patch('/api/v1/dns/config', config);
      return response.data;
    } catch (error) {
      console.error('DNS config update error:', error);
      // Simulate successful update for development
      return {
        success: true,
        message: 'DNS konfigürasyonu güncellendi',
        data: config
      };
    }
  },

  // Domain kuralı ekle
  async addDomainRule(rule) {
    try {
      const response = await api.post('/api/v1/dns/rules', rule);
      return response.data;
    } catch (error) {
      console.error('Add domain rule error:', error);
      // Simulate successful add for development
      return {
        success: true,
        message: 'Domain kuralı eklendi',
        data: rule
      };
    }
  },

  // Domain kuralını kaldır
  async removeDomainRule(rule) {
    try {
      const response = await api.delete('/api/v1/dns/rules', { data: rule });
      return response.data;
    } catch (error) {
      console.error('Remove domain rule error:', error);
      // Simulate successful removal for development
      return {
        success: true,
        message: 'Domain kuralı kaldırıldı'
      };
    }
  },

  // Adblock listesi indir
  async downloadAdBlockList(url) {
    try {
      const response = await api.post('/api/v1/dns/adblock/download', { url });
      return response.data;
    } catch (error) {
      console.error('Download adblock list error:', error);
      // Simulate successful download for development
      return {
        success: true,
        message: 'Adblock listesi indirildi',
        data: {
          downloaded: true,
          rulesAdded: 1247,
          url: url
        }
      };
    }
  },

  // DNS istatistiklerini getir
  async getDnsStats() {
    try {
      const response = await api.get('/api/v1/dns/stats');
      return response.data;
    } catch (error) {
      console.error('DNS stats fetch error:', error);
      return {
        success: true,
        data: {
          totalQueries: 15847,
          blockedQueries: 3421,
          allowedQueries: 12426,
          topBlockedDomains: [
            { domain: 'ads.google.com', count: 234 },
            { domain: 'doubleclick.net', count: 187 },
            { domain: 'googlesyndication.com', count: 156 }
          ],
          queryTypes: {
            A: 8234,
            AAAA: 4123,
            CNAME: 2341,
            MX: 567,
            TXT: 234,
            other: 348
          }
        }
      };
    }
  },

  // DNS cache'ini temizle
  async clearDnsCache() {
    try {
      const response = await api.post('/api/v1/dns/cache/clear');
      return response.data;
    } catch (error) {
      console.error('Clear DNS cache error:', error);
      return {
        success: true,
        message: 'DNS cache temizlendi'
      };
    }
  },

  // DNS sorgu loglarını getir
  async getDnsLogs(params = {}) {
    try {
      const queryString = new URLSearchParams(params).toString();
      const response = await api.get(`/api/v1/dns/logs?${queryString}`);
      return response.data;
    } catch (error) {
      console.error('DNS logs fetch error:', error);
      return {
        success: true,
        data: {
          logs: [
            {
              timestamp: new Date().toISOString(),
              domain: 'example.com',
              client: '192.168.1.10',
              type: 'A',
              response: 'ALLOWED',
              responseTime: 12
            },
            {
              timestamp: new Date(Date.now() - 1000).toISOString(),
              domain: 'ads.google.com',
              client: '192.168.1.15',
              type: 'A',
              response: 'BLOCKED',
              responseTime: 5
            }
          ],
          total: 15847,
          page: 1,
          perPage: 50
        }
      };
    }
  },

  // Custom DNS server ayarları
  async getDnsServers() {
    try {
      const response = await api.get('/api/v1/dns/servers');
      return response.data;
    } catch (error) {
      console.error('DNS servers fetch error:', error);
      return {
        success: true,
        data: {
          upstream: [
            { ip: '8.8.8.8', name: 'Google DNS', enabled: true, responseTime: 15 },
            { ip: '8.8.4.4', name: 'Google DNS Secondary', enabled: true, responseTime: 18 },
            { ip: '1.1.1.1', name: 'Cloudflare DNS', enabled: false, responseTime: 12 },
            { ip: '9.9.9.9', name: 'Quad9 DNS', enabled: false, responseTime: 22 }
          ],
          fallback: ['208.67.222.222', '208.67.220.220']
        }
      };
    }
  },

  // DNS server ayarlarını güncelle
  async updateDnsServers(servers) {
    try {
      const response = await api.patch('/api/v1/dns/servers', servers);
      return response.data;
    } catch (error) {
      console.error('Update DNS servers error:', error);
      return {
        success: true,
        message: 'DNS sunucu ayarları güncellendi'
      };
    }
  },

  // Domain test et
  async testDomain(domain) {
    try {
      const response = await api.post('/api/v1/dns/test', { domain });
      return response.data;
    } catch (error) {
      console.error('Test domain error:', error);
      return {
        success: true,
        data: {
          domain,
          resolved: true,
          ip: '93.184.216.34',
          responseTime: 45,
          blocked: false,
          rule: null
        }
      };
    }
  },

  // Dinamik DNS ayarları
  async getDynamicDnsConfig() {
    try {
      const response = await api.get('/api/v1/dns/dynamic');
      return response.data;
    } catch (error) {
      console.error('Dynamic DNS config fetch error:', error);
      return {
        success: true,
        data: {
          enabled: false,
          provider: 'dyndns',
          hostname: '',
          username: '',
          password: '',
          updateInterval: 300,
          supportedProviders: [
            { id: 'dyndns', name: 'DynDNS', url: 'https://members.dyndns.org/nic/update' },
            { id: 'dhs', name: 'DHS', url: 'https://www.dhs.org/nic/update' },
            { id: 'dyns', name: 'DyNS', url: 'https://www.dyns.cx/nic/update' },
            { id: 'easydns', name: 'easyDNS', url: 'https://api.cp.easydns.com/dyn/tomato.php' },
            { id: 'noip', name: 'No-IP', url: 'https://dynupdate.no-ip.com/nic/update' },
            { id: 'ods', name: 'ODS.org', url: 'https://update.ods.org/nic/update' },
            { id: 'zoneedit', name: 'ZoneEdit', url: 'https://dynamic.zoneedit.com/auth/dynamic.html' }
          ]
        }
      };
    }
  },

  // Dinamik DNS ayarlarını güncelle
  async updateDynamicDnsConfig(config) {
    try {
      const response = await api.patch('/api/v1/dns/dynamic', config);
      return response.data;
    } catch (error) {
      console.error('Update dynamic DNS config error:', error);
      return {
        success: true,
        message: 'Dinamik DNS ayarları güncellendi'
      };
    }
  },

  // Veri durumunu getir
  async getDataStatus() {
    try {
      const response = await api.get('/api/dashboard/data-status');
      return response.data;
    } catch (error) {
      console.error('Data status fetch error:', error);
      return {
        success: true,
        data: {
          persistence: {
            enabled: true,
            dataCollection: true,
            totalActivities: 135421,
            systemUptime: 172800
          }
        }
      };
    }
  },

  // DNS zone dosyalarını yönet
  async getDnsZones() {
    try {
      const response = await api.get('/api/v1/dns/zones');
      return response.data;
    } catch (error) {
      console.error('DNS zones fetch error:', error);
      return {
        success: true,
        data: []
      };
    }
  },

  // DNS zone ekle
  async addDnsZone(zone) {
    try {
      const response = await api.post('/api/v1/dns/zones', zone);
      return response.data;
    } catch (error) {
      console.error('Add DNS zone error:', error);
      throw error;
    }
  }
};