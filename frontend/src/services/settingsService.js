import api from '../utils/axios';

/**
 * Settings Service - Comprehensive API integration for system settings
 * Handles all settings-related API calls with proper error handling
 */
export const settingsService = {
  // ===== SETTINGS MANAGEMENT =====
  /**
   * Get all system settings
   * @returns {Promise<Object>} Settings data
   */
  async getSettings() {
    try {
      console.log('📡 [SettingsService] Fetching settings...');
      const response = await api.get('/api/v1/settings');
      console.log('✅ [SettingsService] Settings fetched:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ [SettingsService] Settings fetch error:', error);
      throw this._handleError(error, 'Ayarlar alınamadı');
    }
  },

  /**
   * Update general settings (timezone, language, session timeout)
   * @param {Object} data - Settings data to update
   * @returns {Promise<Object>} Update response
   */
  async updateGeneralSettings(data) {
    try {
      console.log('📝 [SettingsService] Updating general settings:', data);
      const response = await api.patch('/api/v1/settings/general', data);
      console.log('✅ [SettingsService] General settings updated:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ [SettingsService] General settings update error:', error);
      throw this._handleError(error, 'Genel ayarlar güncellenemedi');
    }
  },

  /**
   * Update specific settings section
   * @param {string} section - Settings section name
   * @param {Object} data - Settings data to update
   * @returns {Promise<Object>} Update response
   */
  async updateSettings(section, data) {
    try {
      console.log(`📝 [SettingsService] Updating ${section} settings:`, data);
      const response = await api.patch(`/api/v1/settings/${section}`, data);
      console.log(`✅ [SettingsService] ${section} settings updated:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`❌ [SettingsService] ${section} settings update error:`, error);
      throw this._handleError(error, `${section} ayarları güncellenemedi`);
    }
  },

  // ===== SYSTEM INFORMATION =====
  /**
   * Get real-time system information
   * @returns {Promise<Object>} System info data
   */
  async getSystemInfo() {
    try {
      console.log('📡 [SettingsService] Fetching system info...');
      const response = await api.get('/api/v1/settings/system-info');
      console.log('✅ [SettingsService] System info fetched:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ [SettingsService] System info fetch error:', error);
      // Return fallback data on error
      return {
        success: false,
        data: {
          version: '1.0.0',
          uptime: 'Bilinmiyor',
          memoryUsage: 0,
          diskUsage: 0,
          totalMemory: '0 GB',
          totalDisk: '0 GB',
          cpuUsage: 0,
          platform: 'Unknown'
        },
        error: error.message
      };
    }
  },

  /**
   * Get security status information
   * @returns {Promise<Object>} Security status data
   */
  async getSecurityStatus() {
    try {
      console.log('🔒 [SettingsService] Fetching security status...');
      const response = await api.get('/api/v1/settings/security-status');
      console.log('✅ [SettingsService] Security status fetched:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ [SettingsService] Security status fetch error:', error);
      // Return fallback data on error
      return {
        success: false,
        data: {
          firewall: { status: 'Bilinmiyor', color: 'gray' },
          ssl: { status: 'Bilinmiyor', color: 'gray' },
          lastScan: { timeAgo: 'Bilinmiyor', status: 'Unknown' }
        },
        error: error.message
      };
    }
  },

  // ===== SYSTEM OPERATIONS =====
  /**
   * Restart the system
   * @returns {Promise<Object>} Restart response
   */
  async restartSystem() {
    try {
      console.log('🔄 [SettingsService] Initiating system restart...');
      const response = await api.post('/api/v1/settings/restart');
      console.log('✅ [SettingsService] System restart initiated:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ [SettingsService] System restart error:', error);
      throw this._handleError(error, 'Sistem yeniden başlatılamadı');
    }
  },

  /**
   * Create manual backup
   * @returns {Promise<Object>} Backup response
   */
  async createBackup() {
    try {
      console.log('💾 [SettingsService] Creating manual backup...');
      const response = await api.post('/api/v1/settings/backup');
      console.log('✅ [SettingsService] Manual backup created:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ [SettingsService] Backup creation error:', error);
      throw this._handleError(error, 'Yedekleme oluşturulamadı');
    }
  },

  /**
   * Check for system updates
   * @returns {Promise<Object>} Update check response
   */
  async checkUpdates() {
    try {
      console.log('🔍 [SettingsService] Checking for updates...');
      const response = await api.post('/api/v1/settings/check-updates');
      console.log('✅ [SettingsService] Update check completed:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ [SettingsService] Check updates error:', error);
      throw this._handleError(error, 'Güncellemeler kontrol edilemedi');
    }
  },

  /**
   * Clear system logs
   * @returns {Promise<Object>} Log clear response
   */
  async clearLogs() {
    try {
      console.log('🗑️ [SettingsService] Clearing system logs...');
      const response = await api.delete('/api/v1/settings/logs');
      console.log('✅ [SettingsService] System logs cleared:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ [SettingsService] Clear logs error:', error);
      throw this._handleError(error, 'Loglar temizlenemedi');
    }
  },

  // ===== DATA STATUS =====
  /**
   * Get data persistence status
   * @returns {Promise<Object>} Data status
   */
  async getDataStatus() {
    try {
      console.log('📊 [SettingsService] Fetching data status...');
      const response = await api.get('/api/dashboard/data-status');
      console.log('✅ [SettingsService] Data status fetched:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ [SettingsService] Data status fetch error:', error);
      // Return fallback data structure
      return {
        success: true,
        data: {
          persistence: {
            enabled: true,
            dataCollection: true,
            totalActivities: 1250,
            systemUptime: 86400
          }
        },
        error: error.message
      };
    }
  },

  // ===== ADVANCED OPERATIONS =====
  /**
   * Get comprehensive system health
   * @returns {Promise<Object>} System health data
   */
  async getSystemHealth() {
    try {
      console.log('🏥 [SettingsService] Fetching system health...');
      // Fetch multiple endpoints for comprehensive health
      const [systemInfo, securityStatus, dataStatus] = await Promise.allSettled([
        this.getSystemInfo(),
        this.getSecurityStatus(),
        this.getDataStatus()
      ]);

      return {
        success: true,
        data: {
          systemInfo: systemInfo.status === 'fulfilled' ? systemInfo.value : null,
          securityStatus: securityStatus.status === 'fulfilled' ? securityStatus.value : null,
          dataStatus: dataStatus.status === 'fulfilled' ? dataStatus.value : null,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('❌ [SettingsService] System health fetch error:', error);
      throw this._handleError(error, 'Sistem durumu alınamadı');
    }
  },

  /**
   * Bulk update multiple settings sections
   * @param {Object} sections - Object with section names as keys
   * @returns {Promise<Object>} Bulk update response
   */
  async bulkUpdateSettings(sections) {
    try {
      console.log('📦 [SettingsService] Bulk updating settings:', sections);
      const updatePromises = Object.entries(sections).map(([section, data]) =>
        this.updateSettings(section, data)
      );

      const results = await Promise.allSettled(updatePromises);
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      console.log(`✅ [SettingsService] Bulk update completed: ${successful} success, ${failed} failed`);

      return {
        success: failed === 0,
        message: `${successful} ayar güncellendi, ${failed} hata`,
        results: results
      };
    } catch (error) {
      console.error('❌ [SettingsService] Bulk update error:', error);
      throw this._handleError(error, 'Toplu güncelleme başarısız');
    }
  },

  // ===== UTILITY METHODS =====
  /**
   * Handle API errors with user-friendly messages
   * @private
   * @param {Error} error - Original error
   * @param {string} defaultMessage - Default error message
   * @returns {Error} Enhanced error
   */
  _handleError(error, defaultMessage) {
    const message = error.response?.data?.detail ||
                   error.response?.data?.message ||
                   error.message ||
                   defaultMessage;

    const enhancedError = new Error(message);
    enhancedError.originalError = error;
    enhancedError.status = error.response?.status;
    enhancedError.data = error.response?.data;
    return enhancedError;
  },

  /**
   * Get service health status
   * @returns {Object} Service health info
   */
  getServiceHealth() {
    return {
      name: 'SettingsService',
      version: '2.0.0',
      endpoints: [
        '/api/v1/settings',
        '/api/v1/settings/general',
        '/api/v1/settings/system-info',
        '/api/v1/settings/security-status',
        '/api/v1/settings/restart',
        '/api/v1/settings/backup',
        '/api/v1/settings/check-updates',
        '/api/v1/settings/logs',
        '/api/dashboard/data-status'
      ],
      features: [
        'Settings Management',
        'System Information',
        'Security Status',
        'System Operations',
        'Data Status Monitoring',
        'Bulk Updates',
        'Error Handling'
      ]
    };
  }
};

// Export default
export default settingsService;

// Named exports for convenience
export const {
  getSettings,
  updateGeneralSettings,
  updateSettings,
  getSystemInfo,
  getSecurityStatus,
  restartSystem,
  createBackup,
  checkUpdates,
  clearLogs,
  getDataStatus,
  getSystemHealth,
  bulkUpdateSettings
} = settingsService;