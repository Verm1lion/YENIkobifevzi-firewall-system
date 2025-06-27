import api from '../utils/axios';

export const natService = {
  // NAT konfigürasyonunu getir
  async getNatConfig() {
    try {
      const response = await api.get('/api/v1/nat/');
      return response.data;
    } catch (error) {
      console.error('NAT config fetch error:', error);
      // Fallback data - backend yapısına uygun
      return {
        success: true,
        data: {
          enabled: false,
          wan_interface: '',
          lan_interface: '',
          dhcp_range_start: '192.168.100.100',
          dhcp_range_end: '192.168.100.200',
          gateway_ip: '192.168.100.1',
          masquerade_enabled: true,
          configuration_type: 'pc_to_pc_sharing',
          status: 'Devre Dışı'
        }
      };
    }
  },

  // NAT konfigürasyonunu güncelle (PUT endpoint kullan)
  async updateNatConfig(config) {
    try {
      const payload = {
        enabled: config.enabled,
        wan_interface: config.wanInterface || config.wan_interface,
        lan_interface: config.lanInterface || config.lan_interface,
        dhcp_range_start: config.dhcp_range_start || '192.168.100.100',
        dhcp_range_end: config.dhcp_range_end || '192.168.100.200',
        gateway_ip: config.gateway_ip || '192.168.100.1',
        masquerade_enabled: config.masquerade_enabled !== undefined ? config.masquerade_enabled : true
      };

      const response = await api.put('/api/v1/nat/', payload);
      return response.data;
    } catch (error) {
      console.error('NAT config update error:', error);
      throw error; // Real error handling for production
    }
  },

  // NAT konfigürasyonunu kısmi güncelle (backward compatibility)
  async patchNatConfig(config) {
    try {
      const payload = {
        enabled: config.enabled,
        wan_interface: config.wanInterface || config.wan_interface,
        lan_interface: config.lanInterface || config.lan_interface,
        dhcp_range_start: config.dhcp_range_start || '192.168.100.100',
        dhcp_range_end: config.dhcp_range_end || '192.168.100.200',
        gateway_ip: config.gateway_ip || '192.168.100.1',
        masquerade_enabled: config.masquerade_enabled !== undefined ? config.masquerade_enabled : true
      };

      const response = await api.patch('/api/v1/nat/', payload);
      return response.data;
    } catch (error) {
      console.error('NAT config patch error:', error);
      throw error;
    }
  },

  // Mevcut ağ arayüzlerini getir (NAT için özel endpoint)
  async getAvailableInterfaces() {
    try {
      const response = await api.get('/api/v1/nat/interfaces');
      return response.data;
    } catch (error) {
      console.error('NAT interfaces fetch error:', error);
      // Fallback data - backend yapısına uygun
      return {
        success: true,
        data: {
          wan_candidates: [
            {
              name: 'wlan0',
              display_name: 'Wi-Fi',
              type: 'wireless',
              status: 'up',
              mac_address: 'AA:BB:CC:DD:EE:FF',
              description: 'Wi-Fi Interface (wlan0)'
            }
          ],
          lan_candidates: [
            {
              name: 'eth0',
              display_name: 'Ethernet 1',
              type: 'ethernet',
              status: 'up',
              mac_address: '00:11:22:33:44:55',
              description: 'Ethernet Interface (eth0)'
            },
            {
              name: 'eth1',
              display_name: 'Ethernet 2',
              type: 'ethernet',
              status: 'down',
              mac_address: '00:11:22:33:44:66',
              description: 'USB-Ethernet Adaptörü'
            }
          ],
          all_interfaces: [
            {
              name: 'wlan0',
              display_name: 'Wi-Fi',
              type: 'wireless',
              status: 'up',
              mac_address: 'AA:BB:CC:DD:EE:FF',
              description: 'Wi-Fi Interface (wlan0)'
            },
            {
              name: 'eth0',
              display_name: 'Ethernet 1',
              type: 'ethernet',
              status: 'up',
              mac_address: '00:11:22:33:44:55',
              description: 'Ethernet Interface (eth0)'
            }
          ]
        }
      };
    }
  },

  // NAT durumunu kontrol et
  async getNatStatus() {
    try {
      const response = await api.get('/api/v1/nat/status');
      return response.data;
    } catch (error) {
      console.error('NAT status fetch error:', error);
      return {
        success: true,
        data: {
          enabled: false,
          status: 'disabled',
          wan_interface: '',
          lan_interface: '',
          gateway_ip: '192.168.100.1',
          dhcp_range_start: '192.168.100.100',
          dhcp_range_end: '192.168.100.200',
          ip_forwarding: false,
          masquerade_active: false,
          message: 'NAT is disabled'
        }
      };
    }
  },

  // PC-to-PC Internet Sharing kurulumu
  async setupPCSharing(config) {
    try {
      const payload = {
        wan_interface: config.wanInterface || config.wan_interface,
        lan_interface: config.lanInterface || config.lan_interface,
        dhcp_range_start: config.dhcp_range_start || '192.168.100.100',
        dhcp_range_end: config.dhcp_range_end || '192.168.100.200'
      };

      const response = await api.post('/api/v1/nat/setup-pc-sharing', payload);
      return response.data;
    } catch (error) {
      console.error('PC sharing setup error:', error);
      throw error;
    }
  },

  // NAT etkinleştir
  async enableNat() {
    try {
      const response = await api.post('/api/v1/nat/enable');
      return response.data;
    } catch (error) {
      console.error('NAT enable error:', error);
      throw error;
    }
  },

  // NAT devre dışı bırak
  async disableNat() {
    try {
      const response = await api.post('/api/v1/nat/disable');
      return response.data;
    } catch (error) {
      console.error('NAT disable error:', error);
      throw error;
    }
  },

  // Interface doğrulama
  async validateInterfaces(wanInterface, lanInterface) {
    try {
      const response = await api.post('/api/v1/nat/validate-interfaces', {
        wan_interface: wanInterface,
        lan_interface: lanInterface
      });
      return response.data;
    } catch (error) {
      console.error('Interface validation error:', error);
      return {
        valid: false,
        errors: ['Validation failed'],
        warnings: []
      };
    }
  },

  // Legacy endpoint desteği (backward compatibility)
  async getLegacyNatConfig() {
    try {
      const response = await api.get('/api/v1/nat/config');
      return response.data;
    } catch (error) {
      console.error('Legacy NAT config fetch error:', error);
      // Fallback to main endpoint
      return this.getNatConfig();
    }
  },

  // Veri durumunu getir (dashboard entegrasyonu için)
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
  },

  // Network service entegrasyonu (interface listesi için fallback)
  async getNetworkInterfaces() {
    try {
      const response = await api.get('/api/v1/network/interfaces');
      return response.data;
    } catch (error) {
      console.error('Network interfaces fetch error:', error);
      // Fallback to NAT interfaces
      return this.getAvailableInterfaces();
    }
  },

  // Eski NAT fonksiyonları (geriye dönük uyumluluk için - ama kullanılmayacak)
  async getNatRules() {
    console.warn('getNatRules is deprecated - NAT rules are handled by firewall module');
    return {
      success: true,
      data: [],
      message: 'NAT rules are handled by firewall module'
    };
  },

  async addNatRule(rule) {
    console.warn('addNatRule is deprecated - use firewall module instead');
    throw new Error('NAT rules are handled by firewall module');
  },

  async updateNatRule(ruleId, rule) {
    console.warn('updateNatRule is deprecated - use firewall module instead');
    throw new Error('NAT rules are handled by firewall module');
  },

  async deleteNatRule(ruleId) {
    console.warn('deleteNatRule is deprecated - use firewall module instead');
    throw new Error('NAT rules are handled by firewall module');
  },

  async getPortForwardingRules() {
    console.warn('Port forwarding is handled by firewall module');
    return {
      success: true,
      data: [],
      message: 'Port forwarding is handled by firewall module'
    };
  },

  async getUpnpSettings() {
    console.warn('UPnP settings are not implemented in current NAT module');
    return {
      success: true,
      data: {
        enabled: false,
        allowedInterfaces: []
      },
      message: 'UPnP settings are not implemented'
    };
  },

  async updateUpnpSettings(settings) {
    console.warn('UPnP settings are not implemented in current NAT module');
    throw new Error('UPnP settings are not implemented');
  }
};