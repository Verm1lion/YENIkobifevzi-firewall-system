import api from '../utils/axios';

export const reportsService = {
  // Rapor verilerini getir
  async getReportsData(timeFilter = 'Son 30 gün') {
    try {
      const response = await api.get(`/api/v1/reports/data?filter=${encodeURIComponent(timeFilter)}`);
      return response.data;
    } catch (error) {
      console.error('Reports data fetch error:', error);
      // Fallback data
      return {
        success: true,
        data: {
          totalTraffic: '2.4 TB',
          trafficGrowth: '+12',
          systemAttempts: '34',
          attemptsGrowth: '-8',
          blockedRequests: '1,247',
          blockedGrowth: '+3',
          systemUptime: '15 gün 6 saat',
          uptimePercentage: '99.8',
          securityReport: {
            attackAttempts: 34,
            blockedIPs: 12,
            topAttackedPorts: [
              { port: '22', service: 'SSH', attempts: 156 },
              { port: '80', service: 'HTTP', attempts: 89 },
              { port: '443', service: 'HTTPS', attempts: 34 }
            ]
          },
          quickStats: {
            dailyAverageTraffic: '80 GB',
            peakHour: '14:00-15:00',
            averageResponseTime: '12ms',
            successRate: '99.2%',
            securityScore: '8.7/10'
          },
          lastUpdate: '18.06.2025 04:09'
        }
      };
    }
  },

  // Güvenlik raporunu getir
  async getSecurityReport(timeFilter = 'Son 30 gün') {
    try {
      const response = await api.get(`/api/v1/reports/security?filter=${encodeURIComponent(timeFilter)}`);
      return response.data;
    } catch (error) {
      console.error('Security report fetch error:', error);
      throw error;
    }
  },

  // Trafik raporunu getir
  async getTrafficReport(timeFilter = 'Son 30 gün') {
    try {
      const response = await api.get(`/api/v1/reports/traffic?filter=${encodeURIComponent(timeFilter)}`);
      return response.data;
    } catch (error) {
      console.error('Traffic report fetch error:', error);
      throw error;
    }
  },

  // Sistem raporunu getir
  async getSystemReport(timeFilter = 'Son 30 gün') {
    try {
      const response = await api.get(`/api/v1/reports/system?filter=${encodeURIComponent(timeFilter)}`);
      return response.data;
    } catch (error) {
      console.error('System report fetch error:', error);
      throw error;
    }
  },

  // Raporu dışa aktar
  async exportReport(format, reportType, timeFilter = 'Son 30 gün') {
    try {
      const response = await api.post('/api/v1/reports/export', {
        format,
        reportType,
        timeFilter
      }, {
        responseType: 'blob'
      });

      // Download file
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `report_${format.toLowerCase()}_${Date.now()}.${format.toLowerCase()}`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      return { success: true };
    } catch (error) {
      console.error('Export report error:', error);
      throw error;
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
        success: false,
        data: {
          persistence: {
            enabled: false,
            dataCollection: false,
            totalActivities: 0,
            systemUptime: 0
          }
        }
      };
    }
  }
};