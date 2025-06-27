import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  FaShieldAlt,
  FaServer,
  FaCog,
  FaClock,
  FaExclamationTriangle,
  FaLock,
  FaHome,
  FaChartBar,
  FaNetworkWired,
  FaRoute,
  FaWrench,
  FaFileAlt,
  FaSync,
  FaSignOutAlt,
  FaChevronLeft,
  FaChevronRight,
  FaGlobe,
  FaDatabase,
  FaCheckCircle,
  FaShare,
  FaInfoCircle,
  FaSave,
  FaWifi,
  FaEthernet,
  FaExclamationCircle,
  FaSpinner
} from 'react-icons/fa';
import { natService } from '../services/natService';
import './NatSettings.css';

// Data Persistence Indicator Component
const DataPersistenceIndicator = () => {
  const [dataStatus, setDataStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDataStatus();
    const interval = setInterval(fetchDataStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchDataStatus = async () => {
    try {
      const response = await natService.getDataStatus();
      if (response.success) {
        setDataStatus(response.data);
      }
      setIsLoading(false);
    } catch (error) {
      console.error('Data status fetch error:', error);
      setIsLoading(false);
    }
  };

  if (isLoading || !dataStatus) {
    return (
      <div className="flex items-center space-x-2 px-3 py-1 bg-gray-500/20 rounded-full">
        <FaDatabase className="text-gray-400 text-sm animate-pulse" />
        <span className="text-gray-400 text-xs">Veri durumu kontrol ediliyor...</span>
      </div>
    );
  }

  const formatUptime = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    return days > 0 ? `${days}g ${hours}s` : `${hours}s`;
  };

  const isPersistent = dataStatus?.persistence?.enabled && dataStatus?.persistence?.dataCollection;
  return (
    <div className="flex items-center space-x-2 px-3 py-1 bg-slate-800/50 rounded-full border border-slate-700/50">
      <div className={`flex items-center space-x-1 ${isPersistent ? 'text-green-400' : 'text-yellow-400'}`}>
        {isPersistent ? <FaCheckCircle className="text-sm" /> : <FaExclamationTriangle className="text-sm" />}
        <FaDatabase className="text-sm" />
      </div>
      <div className="text-xs">
        <span className={isPersistent ? 'text-green-300' : 'text-yellow-300'}>
          {isPersistent ? 'Kalıcı Veri' : 'Veri Sorunu'}
        </span>
        <span className="text-gray-400 ml-1">
          ({dataStatus?.persistence?.totalActivities?.toLocaleString() || 0} kayıt)
        </span>
      </div>
      <div className="text-xs text-gray-500">
        Çalışma: {formatUptime(dataStatus?.persistence?.systemUptime || 0)}
      </div>
    </div>
  );
};

const NatSettings = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeMenu, setActiveMenu] = useState('nat-settings');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  // NAT Configuration State - Backend uyumlu
  const [natConfig, setNatConfig] = useState({
    enabled: false,
    wan_interface: '',
    lan_interface: '',
    dhcp_range_start: '192.168.100.100',
    dhcp_range_end: '192.168.100.200',
    gateway_ip: '192.168.100.1',
    masquerade_enabled: true,
    status: 'Devre Dışı'
  });

  // NAT Status State
  const [natStatus, setNatStatus] = useState({
    enabled: false,
    status: 'disabled',
    ip_forwarding: false,
    masquerade_active: false,
    message: ''
  });

  // Available network interfaces - Backend yapısına uygun
  const [availableInterfaces, setAvailableInterfaces] = useState({
    wan_candidates: [],
    lan_candidates: [],
    all_interfaces: []
  });

  const [successMessage, setSuccessMessage] = useState('');
  const [validationErrors, setValidationErrors] = useState([]);
  const [validationWarnings, setValidationWarnings] = useState([]);

  const menuItems = [
    { id: 'home', label: 'Ana Sayfa', icon: FaHome },
    { id: 'logs', label: 'Loglar', icon: FaChartBar },
    { id: 'security-rules', label: 'Güvenlik Kuralları', icon: FaShieldAlt },
    { id: 'rule-groups', label: 'Kural Grupları', icon: FaCog },
    { id: 'interface-settings', label: 'Interface Ayarları', icon: FaNetworkWired },
    { id: 'nat-settings', label: 'NAT Ayarları', icon: FaRoute },
    { id: 'routes', label: 'Rotalar', icon: FaRoute },
    { id: 'dns-management', label: 'DNS Yönetimi', icon: FaGlobe },
    { id: 'settings', label: 'Ayarlar', icon: FaWrench },
    { id: 'reports', label: 'Raporlar', icon: FaFileAlt },
    { id: 'updates', label: 'Güncellemeler', icon: FaSync }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    fetchNatData();
    fetchAvailableInterfaces();
    fetchNatStatus();

    // Periodic status update
    const statusInterval = setInterval(fetchNatStatus, 30000);

    return () => {
      clearInterval(timer);
      clearInterval(statusInterval);
    };
  }, []);

  const fetchNatData = async () => {
    try {
      setIsLoading(true);
      const response = await natService.getNatConfig();
      if (response.success) {
        setNatConfig({
          enabled: response.data.enabled || false,
          wan_interface: response.data.wan_interface || '',
          lan_interface: response.data.lan_interface || '',
          dhcp_range_start: response.data.dhcp_range_start || '192.168.100.100',
          dhcp_range_end: response.data.dhcp_range_end || '192.168.100.200',
          gateway_ip: response.data.gateway_ip || '192.168.100.1',
          masquerade_enabled: response.data.masquerade_enabled !== undefined ? response.data.masquerade_enabled : true,
          status: response.data.enabled ? 'Aktif' : 'Devre Dışı'
        });
      }
    } catch (error) {
      console.error('NAT data fetch error:', error);
      toast.error('NAT konfigürasyonu alınamadı');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailableInterfaces = async () => {
    try {
      const response = await natService.getAvailableInterfaces();
      if (response.success) {
        setAvailableInterfaces(response.data);
      }
    } catch (error) {
      console.error('Interfaces fetch error:', error);
      // Set fallback interfaces
      setAvailableInterfaces({
        wan_candidates: [
          {
            name: 'wlan0',
            display_name: 'Wi-Fi',
            type: 'wireless',
            status: 'up',
            description: 'Wi-Fi Interface (wlan0)'
          }
        ],
        lan_candidates: [
          {
            name: 'eth0',
            display_name: 'Ethernet 1',
            type: 'ethernet',
            status: 'up',
            description: 'Ethernet Interface (eth0)'
          }
        ],
        all_interfaces: []
      });
    }
  };

  const fetchNatStatus = async () => {
    try {
      const response = await natService.getNatStatus();
      if (response.success) {
        setNatStatus(response.data);
      }
    } catch (error) {
      console.error('NAT status fetch error:', error);
    }
  };

  const validateInterfaces = async (wanInterface, lanInterface) => {
    if (!wanInterface || !lanInterface) return;

    try {
      setIsValidating(true);
      const response = await natService.validateInterfaces(wanInterface, lanInterface);

      setValidationErrors(response.errors || []);
      setValidationWarnings(response.warnings || []);

      return response.valid;
    } catch (error) {
      console.error('Interface validation error:', error);
      setValidationErrors(['Interface doğrulama başarısız']);
      return false;
    } finally {
      setIsValidating(false);
    }
  };

  const handleNatToggle = async (enabled) => {
    const newConfig = {
      ...natConfig,
      enabled,
      status: enabled ? 'Aktif' : 'Devre Dışı'
    };

    setNatConfig(newConfig);

    // Validate interfaces if enabling
    if (enabled && newConfig.wan_interface && newConfig.lan_interface) {
      await validateInterfaces(newConfig.wan_interface, newConfig.lan_interface);
    }
  };

  const handleInterfaceChange = async (type, interfaceName) => {
    const newConfig = {
      ...natConfig,
      [type]: interfaceName
    };

    setNatConfig(newConfig);

    // Clear previous validation
    setValidationErrors([]);
    setValidationWarnings([]);

    // Validate if both interfaces are selected
    if (newConfig.wan_interface && newConfig.lan_interface) {
      await validateInterfaces(newConfig.wan_interface, newConfig.lan_interface);
    }
  };

  const handleAdvancedSettingChange = (key, value) => {
    setNatConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSaveSettings = async () => {
    try {
      setIsSaving(true);

      // Frontend validation
      if (natConfig.enabled && (!natConfig.wan_interface || !natConfig.lan_interface)) {
        toast.error('NAT aktifken WAN ve LAN arayüzleri seçilmelidir');
        return;
      }

      if (natConfig.wan_interface === natConfig.lan_interface && natConfig.wan_interface) {
        toast.error('WAN ve LAN arayüzleri farklı olmalıdır');
        return;
      }

      // Backend validation
      if (natConfig.enabled) {
        const isValid = await validateInterfaces(natConfig.wan_interface, natConfig.lan_interface);
        if (!isValid) {
          toast.error('Interface doğrulama başarısız. Hataları kontrol edin.');
          return;
        }
      }

      const response = await natService.updateNatConfig(natConfig);

      if (response.success) {
        setSuccessMessage('NAT ayarları başarıyla kaydedildi');
        toast.success('NAT ayarları başarıyla kaydedildi');

        // Refresh NAT status
        setTimeout(() => {
          fetchNatStatus();
        }, 2000);

        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccessMessage('');
        }, 3000);
      } else {
        toast.error(response.message || 'NAT ayarları kaydedilemedi');
        if (response.errors) {
          setValidationErrors(response.errors);
        }
      }
    } catch (error) {
      console.error('NAT save error:', error);
      toast.error('NAT ayarları kaydedilirken hata oluştu');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePCToPC = async () => {
    try {
      setIsSaving(true);

      if (!natConfig.wan_interface || !natConfig.lan_interface) {
        toast.error('PC-to-PC paylaşım için WAN ve LAN arayüzleri seçilmelidir');
        return;
      }

      const response = await natService.setupPCSharing({
        wan_interface: natConfig.wan_interface,
        lan_interface: natConfig.lan_interface,
        dhcp_range_start: natConfig.dhcp_range_start,
        dhcp_range_end: natConfig.dhcp_range_end
      });

      if (response.success) {
        toast.success('PC-to-PC internet paylaşımı kuruldu');
        setNatConfig(prev => ({ ...prev, enabled: true, status: 'Aktif' }));
        setTimeout(() => {
          fetchNatStatus();
        }, 2000);
      } else {
        toast.error(response.message || 'PC-to-PC kurulum başarısız');
        if (response.errors) {
          setValidationErrors(response.errors);
        }
      }
    } catch (error) {
      console.error('PC-to-PC setup error:', error);
      toast.error('PC-to-PC kurulum sırasında hata oluştu');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Başarıyla çıkış yapıldı');
    } catch (error) {
      toast.error('Çıkış yapılırken hata oluştu');
    }
  };

  const handleMenuClick = (menuId) => {
    if (menuId === 'home') {
      navigate('/dashboard');
    } else if (menuId === 'updates') {
      navigate('/updates');
    } else if (menuId === 'reports') {
      navigate('/reports');
    } else if (menuId === 'settings') {
      navigate('/settings');
    } else if (menuId === 'nat-settings') {
      setActiveMenu(menuId);
    } else {
      navigate('/dashboard');
    }
  };

  const getInterfaceIcon = (type) => {
    return type === 'wireless' ? FaWifi : FaEthernet;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'text-green-400';
      case 'disabled':
        return 'text-red-400';
      case 'configured_but_inactive':
        return 'text-yellow-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex">
      {/* Sidebar */}
      <div className={`${isCollapsed ? 'w-16' : 'w-64'} h-screen bg-slate-900/95 backdrop-blur-xl border-r border-slate-700/50 flex flex-col transition-all duration-300 fixed left-0 top-0 z-40`}>
        {/* Header */}
        <div className="p-4 border-b border-slate-700/50">
          <div className="flex items-center justify-between">
            {!isCollapsed && (
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <FaShieldAlt className="text-white text-sm" />
                </div>
                <span className="text-white font-bold text-lg">NetGate</span>
              </div>
            )}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="text-gray-400 hover:text-white transition-colors p-1"
            >
              {isCollapsed ? <FaChevronRight /> : <FaChevronLeft />}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeMenu === item.id;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => handleMenuClick(item.id)}
                    className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'text-gray-400 hover:text-white hover:bg-slate-800/50'
                    }`}
                    title={isCollapsed ? item.label : ''}
                  >
                    <Icon className="text-lg" />
                    {!isCollapsed && <span className="font-medium">{item.label}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-slate-700/50">
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-3 py-2.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all duration-200"
            title={isCollapsed ? 'Çıkış Yap' : ''}
          >
            <FaSignOutAlt className="text-lg" />
            {!isCollapsed && <span className="font-medium">Çıkış Yap</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className={`flex-1 ${isCollapsed ? 'ml-16' : 'ml-64'} transition-all duration-300`}>
        {/* Header */}
        <header className="bg-slate-800/50 backdrop-blur-xl border-b border-slate-700/50 sticky top-0 z-30">
          <div className="px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h2 className="text-xl font-semibold text-white">NAT Ayarları</h2>
                <span className="text-gray-400 text-sm">Ağ Adresi Çevirisi (Network Address Translation) yapılandırması</span>
                <DataPersistenceIndicator />
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-300">
                  {currentTime.toLocaleString('tr-TR')}
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">
                      {user?.username?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-white font-medium">Hoş geldin, {user?.username}</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="nat-settings-page">
          <div className="page-header">
            <div className="page-title">
              <FaRoute className="nat-icon text-blue-400" />
              <div>
                <h1>Nat Ayarları</h1>
                <p>Ağ Adresi Çevirisi yapılandırması</p>
              </div>
            </div>
          </div>

          {/* Success Alert */}
          {successMessage && (
            <div className="alert alert-success">
              <FaCheckCircle className="inline mr-2" />
              {successMessage}
            </div>
          )}

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="alert alert-error mb-6">
              <FaExclamationCircle className="inline mr-2" />
              <div>
                <strong>Doğrulama Hataları:</strong>
                <ul className="mt-2 list-disc list-inside">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Validation Warnings */}
          {validationWarnings.length > 0 && (
            <div className="alert alert-warning mb-6">
              <FaExclamationTriangle className="inline mr-2" />
              <div>
                <strong>Uyarılar:</strong>
                <ul className="mt-2 list-disc list-inside">
                  {validationWarnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Internet Connection Sharing (ICS) */}
          <div className="nat-card bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6">
            <div className="card-header">
              <FaShare className="card-icon text-green-400" />
              <h3>Internet Bağlantı Paylaşımı (ICS)</h3>
            </div>
            <p className="ics-description">
              NAT sayesinde bir internet bağlantısını birden fazla cihazla paylaşabilirsiniz. WAN arayüzünden gelen internet erişimini LAN arayüzüne bağlı cihazlara dağıtır.
            </p>
          </div>

          {/* NAT Status */}
          <div className="nat-card bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6">
            <div className="nat-status-header">
              <div className="status-info">
                <div className="status-icon">
                  <FaServer className="text-white" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg">NAT Durumu</h3>
                  <p className="status-description">
                    Internet bağlantı paylaşımı etkinliğini yönetin ve devreye alın
                  </p>
                  {natStatus.message && (
                    <p className={`text-sm mt-2 ${getStatusColor(natStatus.status)}`}>
                      {natStatus.message}
                    </p>
                  )}
                </div>
              </div>
              <div className="status-controls">
                <div className="flex flex-col items-end space-y-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    natConfig.enabled
                      ? 'bg-green-500/20 text-green-300'
                      : 'bg-red-500/20 text-red-300'
                  }`}>
                    {natConfig.status}
                  </span>
                  {natStatus.status !== 'not_configured' && (
                    <div className="text-xs text-gray-400">
                      IP Forwarding: {natStatus.ip_forwarding ? '✓' : '✗'} |
                      Masquerade: {natStatus.masquerade_active ? '✓' : '✗'}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleNatToggle(!natConfig.enabled)}
                  disabled={isLoading || isValidating}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 ${
                    natConfig.enabled ? 'bg-green-600' : 'bg-gray-600'
                  } disabled:opacity-50`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-200 ${
                      natConfig.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Interface Selection */}
          <div className="interface-grid">
            {/* WAN Interface */}
            <div className="interface-card bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6">
              <div className="card-header">
                <div className="interface-icon wan-icon">
                  <FaWifi className="text-white" />
                </div>
                <h3>WAN Arayüzü</h3>
              </div>
              <p className="interface-description">Internet erişimi olan arayüz (Wi-Fi önerilir)</p>
              <select
                value={natConfig.wan_interface}
                onChange={(e) => handleInterfaceChange('wan_interface', e.target.value)}
                disabled={isLoading || isValidating}
                className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              >
                <option value="">Arayüz Seçiniz</option>
                {availableInterfaces.wan_candidates?.map((interface_, index) => {
                  const Icon = getInterfaceIcon(interface_.type);
                  return (
                    <option key={index} value={interface_.name}>
                      {interface_.display_name} - {interface_.description} ({interface_.status})
                    </option>
                  );
                })}
              </select>
              {isValidating && (
                <div className="flex items-center mt-2 text-blue-400 text-sm">
                  <FaSpinner className="animate-spin mr-2" />
                  Doğrulanıyor...
                </div>
              )}
            </div>

            {/* LAN Interface */}
            <div className="interface-card bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6">
              <div className="card-header">
                <div className="interface-icon lan-icon">
                  <FaEthernet className="text-white" />
                </div>
                <h3>LAN Arayüzü</h3>
              </div>
              <p className="interface-description">İç ağa paylaşılacak arayüz (Ethernet önerilir)</p>
              <select
                value={natConfig.lan_interface}
                onChange={(e) => handleInterfaceChange('lan_interface', e.target.value)}
                disabled={isLoading || isValidating}
                className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              >
                <option value="">Arayüz Seçiniz</option>
                {availableInterfaces.lan_candidates?.map((interface_, index) => {
                  const Icon = getInterfaceIcon(interface_.type);
                  return (
                    <option key={index} value={interface_.name}>
                      {interface_.display_name} - {interface_.description} ({interface_.status})
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Advanced Settings */}
          {natConfig.enabled && (
            <div className="nat-card bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6">
              <div className="card-header">
                <FaCog className="card-icon text-blue-400" />
                <h3>Gelişmiş Ayarlar</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    DHCP Aralığı Başlangıç
                  </label>
                  <input
                    type="text"
                    value={natConfig.dhcp_range_start}
                    onChange={(e) => handleAdvancedSettingChange('dhcp_range_start', e.target.value)}
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white"
                    placeholder="192.168.100.100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    DHCP Aralığı Bitiş
                  </label>
                  <input
                    type="text"
                    value={natConfig.dhcp_range_end}
                    onChange={(e) => handleAdvancedSettingChange('dhcp_range_end', e.target.value)}
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white"
                    placeholder="192.168.100.200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Gateway IP
                  </label>
                  <input
                    type="text"
                    value={natConfig.gateway_ip}
                    onChange={(e) => handleAdvancedSettingChange('gateway_ip', e.target.value)}
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white"
                    placeholder="192.168.100.1"
                  />
                </div>
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="masquerade"
                    checked={natConfig.masquerade_enabled}
                    onChange={(e) => handleAdvancedSettingChange('masquerade_enabled', e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded"
                  />
                  <label htmlFor="masquerade" className="text-sm font-medium text-gray-300">
                    Masquerade Etkinleştir
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="save-section">
            <div className="flex space-x-4">
              <button
                onClick={handleSaveSettings}
                disabled={isSaving || isLoading || isValidating}
                className="save-btn bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isSaving ? (
                  <>
                    <FaSync className="animate-spin" />
                    <span>Kaydediliyor...</span>
                  </>
                ) : (
                  <>
                    <FaSave />
                    <span>Ayarları Kaydet</span>
                  </>
                )}
              </button>

              {natConfig.wan_interface && natConfig.lan_interface && !natConfig.enabled && (
                <button
                  onClick={handlePCToPC}
                  disabled={isSaving || isLoading || isValidating}
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <FaShare />
                  <span>PC-to-PC Paylaşımı Kur</span>
                </button>
              )}
            </div>
          </div>

          {/* NAT Information */}
          <div className="nat-card info-card bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6">
            <div className="card-header">
              <FaInfoCircle className="card-icon text-blue-400" />
              <h3>NAT Hakkında</h3>
            </div>
            <div className="nat-info">
              <p>
                <strong>Network Address Translation (NAT)</strong>, özel IP adreslerini genel IP adreslerine çeviren bir ağ teknolojisidir.
                Bu sayede tek bir genel IP adresi ile birden fazla cihazın internete erişim sağlaması mümkün olur.
              </p>
              <p>
                <strong>Tipik Kullanım:</strong> Modem/router'dan gelen internet bağlantısını (WAN) evdeki/ofisteki diğer cihazlara (LAN) paylaşmak için kullanılır.
              </p>
              <p>
                <strong>Güvenlik:</strong> NAT aynı zamanda bir güvenlik katmanı sağlar çünkü dış ağdan iç ağa doğrudan erişim engellenir.
              </p>
              <p>
                <strong>PC-to-PC Paylaşım:</strong> Bu sistemde Wi-Fi'dan gelen internet bağlantısı Ethernet üzerinden başka bir bilgisayara paylaşılabilir.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default NatSettings;