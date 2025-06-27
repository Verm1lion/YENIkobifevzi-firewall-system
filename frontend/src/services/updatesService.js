// src/services/updatesService.js
import api from '../utils/axios';

export const updatesService = {
  // Güncelleme verilerini getir
  async getUpdatesData() {
    try {
      const response = await api.get('/api/v1/system/updates');
      return response.data;
    } catch (error) {
      console.error('Updates data fetch error:', error);
      throw error;
    }
  },

  // Güncelleme kontrolü yap
  async checkUpdates() {
    try {
      const response = await api.post('/api/v1/system/updates/check');
      return response.data;
    } catch (error) {
      console.error('Check updates error:', error);
      throw error;
    }
  },

  // Güncelleme yükle
  async installUpdate(updateId) {
    try {
      const response = await api.post(`/api/v1/system/updates/${updateId}/install`);
      return response.data;
    } catch (error) {
      console.error('Install update error:', error);
      throw error;
    }
  },

  // Güncelleme ayarlarını güncelle
  async updateSettings(settings) {
    try {
      const response = await api.patch('/api/v1/system/updates/settings', settings);
      return response.data;
    } catch (error) {
      console.error('Update settings error:', error);
      throw error;
    }
  },

  // Güncelleme geçmişini getir
  async getUpdateHistory(limit = 20) {
    try {
      const response = await api.get(`/api/v1/system/updates/history?limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Update history fetch error:', error);
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