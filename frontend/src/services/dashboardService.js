import api from '../utils/axios';

export const dashboardService = {
  // Dashboard istatistiklerini getir
  async getStats() {
    try {
      const response = await api.get('/api/v1/dashboard/stats'); // API yolunu düzelt
      return response.data;
    } catch (error) {
      console.error('Stats fetch error:', error);
      throw error;
    }
  },

  // Chart verilerini getir
  async getChartData(period = '24h') {
    try {
      const response = await api.get(`/api/v1/dashboard/chart-data?period=${period}`);
      return response.data;
    } catch (error) {
      console.error('Chart data fetch error:', error);
      throw error;
    }
  },

  // Son aktiviteleri getir
  async getRecentActivity(limit = 10) {
    try {
      const response = await api.get(`/api/v1/dashboard/recent-activity?limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Recent activity fetch error:', error);
      throw error;
    }
  },

  // Bağlı cihazları getir
  async getConnectedDevices() {
    try {
      const response = await api.get('/api/v1/dashboard/connected-devices');
      return response.data;
    } catch (error) {
      console.error('Connected devices fetch error:', error);
      throw error;
    }
  },

  // Demo veri oluştur (test için)
  async simulateActivity() {
    try {
      const response = await api.post('/api/v1/dashboard/simulate-activity');
      return response.data;
    } catch (error) {
      console.error('Simulate activity error:', error);
      throw error;
    }
  }
};

export const firewallService = {
  // Firewall kurallarını getir
  async getRules(params = {}) {
    try {
      const queryString = new URLSearchParams(params).toString();
      const response = await api.get(`/api/v1/firewall/rules?${queryString}`);
      return response.data;
    } catch (error) {
      console.error('Get rules error:', error);
      throw error;
    }
  },

  // Varsayılan kuralları oluştur
  async initializeRules() {
    try {
      const response = await api.post('/api/v1/firewall/initialize-rules');
      return response.data;
    } catch (error) {
      console.error('Initialize rules error:', error);
      throw error;
    }
  }
};