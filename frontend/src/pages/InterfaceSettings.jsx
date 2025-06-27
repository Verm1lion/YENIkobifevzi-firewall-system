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
  FaPlus,
  FaTrash,
  FaEdit,
  FaTimes,
  FaSave,
  FaInfoCircle,
  FaWifi,
  FaEthernet
} from 'react-icons/fa';
import { interfaceService } from '../services/interfaceService';
import './InterfaceSettings.css';

console.log('🌐 [INTERFACE] InterfaceSettings component yüklendi');

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
      const response = await interfaceService.getDataStatus();
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

const InterfaceSettings = () => {
  console.log('🌐 [INTERFACE] InterfaceSettings component render başladı');
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeMenu, setActiveMenu] = useState('interface-settings');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Interface Settings State
  const [interfaces, setInterfaces] = useState([]);
  const [availableInterfaces, setAvailableInterfaces] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingInterface, setEditingInterface] = useState(null);

  // YENİ INTERFACE STATE - ICS ALANLARI DAHİL
  const [newInterface, setNewInterface] = useState({
    name: '',
    ipMode: 'static',
    ipAddress: '',
    subnetMask: '',
    gateway: '',
    primaryDns: '',
    secondaryDns: '',
    mtuSize: '1500',
    vlanId: '',
    enabled: true,
    // YENİ ICS ALANLARI
    icsEnabled: false,
    icsSourceInterface: '',
    dhcpRangeStart: '192.168.100.100',
    dhcpRangeEnd: '192.168.100.200',
    description: ''
  });

  const menuItems = [
    { id: 'home', label: 'Ana Sayfa', icon: FaHome },
    { id: 'logs', label: 'Loglar', icon: FaChartBar },
    { id: 'security-rules', label: 'Güvenlik Kuralları', icon: FaShieldAlt },
    { id: 'rule-groups', label: 'Kural Grupları', icon: FaCog },
    { id: 'interface-settings', label: 'İnterface Ayarları', icon: FaNetworkWired },
    { id: 'nat-settings', label: 'NAT Ayarları', icon: FaRoute },
    { id: 'routes', label: 'Rotalar', icon: FaRoute },
    { id: 'dns-management', label: 'DNS Yönetimi', icon: FaGlobe },
    { id: 'settings', label: 'Ayarlar', icon: FaWrench },
    { id: 'reports', label: 'Raporlar', icon: FaFileAlt },
    { id: 'updates', label: 'Güncellemeler', icon: FaSync }
  ];

  useEffect(() => {
    console.log('🌐 [INTERFACE] useEffect başladı');
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    fetchInterfaces();
    fetchAvailableInterfaces();

    return () => {
      console.log('🌐 [INTERFACE] Component unmount, timer temizleniyor');
      clearInterval(timer);
    };
  }, []);

  const fetchInterfaces = async () => {
    try {
      console.log('🌐 [INTERFACE] Interfaces data fetch başladı');
      setIsLoading(true);
      const response = await interfaceService.getInterfaces();
      if (response.success) {
        console.log('🌐 [INTERFACE] Interfaces data başarıyla alındı:', response.data);
        setInterfaces(response.data || []);
      }
    } catch (error) {
      console.error('🌐 [INTERFACE] Interfaces data fetch error:', error);
      toast.error('Ağ arayüzleri alınamadı');
    } finally {
      setIsLoading(false);
    }
  };

  // YENİ FİZİKSEL INTERFACE'LERİ GETIRME FONKSİYONU
  const fetchAvailableInterfaces = async () => {
    try {
      // Fiziksel interface'leri al
      const response = await interfaceService.getPhysicalInterfaces();
      if (response.success) {
        setAvailableInterfaces(response.data || []);
      }
    } catch (error) {
      console.error('Interfaces fetch error:', error);
      // Fallback data
      setAvailableInterfaces([
        { name: 'eth0', display_name: 'Ethernet 1', description: 'Primary Ethernet Interface' },
        { name: 'eth1', display_name: 'Ethernet 2', description: 'Secondary Ethernet Interface' },
        { name: 'wlan0', display_name: 'Wi-Fi', description: 'Wireless Network Interface' }
      ]);
    }
  };

  const handleAddInterface = async () => {
    if (!validateInterface(newInterface)) {
      return;
    }
    try {
      console.log('🌐 [INTERFACE] Interface ekleniyor:', newInterface);
      setIsSaving(true);
      const response = await interfaceService.createInterface(newInterface);
      if (response.success) {
        setInterfaces(prev => [...prev, response.data]);
        toast.success('Ağ arayüzü başarıyla oluşturuldu');
        resetForm();
        setShowAddModal(false);
      }
    } catch (error) {
      console.error('Add interface error:', error);
      toast.error('Ağ arayüzü oluşturulurken hata oluştu');
    } finally {
      setIsSaving(false);
    }
  };

  // GÜNCELLENMİŞ EDIT FONKSİYONU - ICS ALANLARINI DAHIL EDER
  const handleEditInterface = (interfaceItem) => {
    setEditingInterface(interfaceItem);
    setNewInterface({
      name: interfaceItem.name,
      ipMode: interfaceItem.ipMode,
      ipAddress: interfaceItem.ipAddress,
      subnetMask: interfaceItem.subnetMask,
      gateway: interfaceItem.gateway,
      primaryDns: interfaceItem.primaryDns,
      secondaryDns: interfaceItem.secondaryDns,
      mtuSize: interfaceItem.mtuSize.toString(),
      vlanId: interfaceItem.vlanId.toString(),
      enabled: interfaceItem.enabled,
      // YENİ ICS ALANLARI
      icsEnabled: interfaceItem.icsEnabled || false,
      icsSourceInterface: interfaceItem.icsSourceInterface || '',
      dhcpRangeStart: interfaceItem.dhcpRangeStart || '192.168.100.100',
      dhcpRangeEnd: interfaceItem.dhcpRangeEnd || '192.168.100.200',
      description: interfaceItem.description || ''
    });
    setShowAddModal(true);
  };

  const handleUpdateInterface = async () => {
    if (!validateInterface(newInterface)) {
      return;
    }
    try {
      console.log('🌐 [INTERFACE] Interface güncelleniyor:', editingInterface.id, newInterface);
      setIsSaving(true);
      const response = await interfaceService.updateInterface(editingInterface.id, newInterface);
      if (response.success) {
        setInterfaces(prev => prev.map(iface =>
          iface.id === editingInterface.id
            ? { ...iface, ...newInterface, mtuSize: parseInt(newInterface.mtuSize), vlanId: parseInt(newInterface.vlanId) || null }
            : iface
        ));
        toast.success('Ağ arayüzü başarıyla güncellendi');
        resetForm();
        setShowAddModal(false);
        setEditingInterface(null);
      }
    } catch (error) {
      console.error('Update interface error:', error);
      toast.error('Ağ arayüzü güncellenirken hata oluştu');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteInterface = async (interfaceId) => {
    if (!window.confirm('Bu ağ arayüzünü silmek istediğinizden emin misiniz?')) {
      return;
    }
    try {
      console.log('🌐 [INTERFACE] Interface siliniyor:', interfaceId);
      const response = await interfaceService.deleteInterface(interfaceId);
      if (response.success) {
        setInterfaces(prev => prev.filter(iface => iface.id !== interfaceId));
        toast.success('Ağ arayüzü başarıyla silindi');
      }
    } catch (error) {
      console.error('Delete interface error:', error);
      toast.error('Ağ arayüzü silinirken hata oluştu');
    }
  };

  const handleToggleInterface = async (interfaceId, enabled) => {
    try {
      const response = await interfaceService.toggleInterface(interfaceId, enabled);
      if (response.success) {
        setInterfaces(prev => prev.map(iface =>
          iface.id === interfaceId ? { ...iface, enabled } : iface
        ));
        toast.success(`Ağ arayüzü ${enabled ? 'etkinleştirildi' : 'devre dışı bırakıldı'}`);
      }
    } catch (error) {
      console.error('Toggle interface error:', error);
      toast.error('Ağ arayüzü durumu değiştirilemedi');
    }
  };

  // GÜNCELLENMİŞ VALİDASYON FONKSİYONU - ICS VALİDASYONU DAHİL
  const validateInterface = (iface) => {
    if (!iface.name.trim()) {
      toast.error('Arayüz adı gerekli');
      return false;
    }

    if (iface.ipMode === 'static') {
      if (!iface.ipAddress.trim()) {
        toast.error('IP adresi gerekli');
        return false;
      }
      if (!iface.subnetMask.trim()) {
        toast.error('Alt ağ maskesi gerekli');
        return false;
      }

      // IP format validation
      const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
      if (!ipRegex.test(iface.ipAddress)) {
        toast.error('Geçersiz IP adresi formatı');
        return false;
      }
      if (!ipRegex.test(iface.subnetMask)) {
        toast.error('Geçersiz alt ağ maskesi formatı');
        return false;
      }
      if (iface.gateway && !ipRegex.test(iface.gateway)) {
        toast.error('Geçersiz ağ geçidi formatı');
        return false;
      }
      if (iface.primaryDns && !ipRegex.test(iface.primaryDns)) {
        toast.error('Geçersiz birincil DNS formatı');
        return false;
      }
      if (iface.secondaryDns && !ipRegex.test(iface.secondaryDns)) {
        toast.error('Geçersiz ikincil DNS formatı');
        return false;
      }
    }

    // ICS Validation
    if (iface.icsEnabled) {
      if (!iface.icsSourceInterface.trim()) {
        toast.error('ICS için kaynak interface seçilmeli');
        return false;
      }
      if (!iface.dhcpRangeStart.trim()) {
        toast.error('DHCP aralığı başlangıç IP adresi gerekli');
        return false;
      }
      if (!iface.dhcpRangeEnd.trim()) {
        toast.error('DHCP aralığı bitiş IP adresi gerekli');
        return false;
      }
      // DHCP range IP validation
      const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
      if (!ipRegex.test(iface.dhcpRangeStart)) {
        toast.error('Geçersiz DHCP başlangıç IP formatı');
        return false;
      }
      if (!ipRegex.test(iface.dhcpRangeEnd)) {
        toast.error('Geçersiz DHCP bitiş IP formatı');
        return false;
      }
    }

    return true;
  };

  // GÜNCELLENMİŞ RESET FORM FONKSİYONU
  const resetForm = () => {
    setNewInterface({
      name: '',
      ipMode: 'static',
      ipAddress: '',
      subnetMask: '',
      gateway: '',
      primaryDns: '',
      secondaryDns: '',
      mtuSize: '1500',
      vlanId: '',
      enabled: true,
      // YENİ ALANLAR
      icsEnabled: false,
      icsSourceInterface: '',
      dhcpRangeStart: '192.168.100.100',
      dhcpRangeEnd: '192.168.100.200',
      description: ''
    });
    setEditingInterface(null);
  };

  const handleLogout = async () => {
    try {
      console.log('🌐 [INTERFACE] Logout başladı');
      await logout();
      toast.success('Başarıyla çıkış yapıldı');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Çıkış yapılırken hata oluştu');
    }
  };

  const handleMenuClick = (menuId) => {
    console.log('🌐 [INTERFACE] Menu tıklandı:', menuId);
    if (menuId === 'interface-settings') {
      console.log('🌐 [INTERFACE] Interface Settings seçildi, activeMenu güncelleniyor');
      setActiveMenu(menuId);
      return;
    }

    // Diğer sayfalara yönlendirmeler
    if (menuId === 'home') {
      console.log('🌐 [INTERFACE] Ana sayfaya yönlendiriliyor');
      navigate('/dashboard');
    } else if (menuId === 'updates') {
      console.log('🌐 [INTERFACE] Updates sayfasına yönlendiriliyor');
      navigate('/updates');
    } else if (menuId === 'reports') {
      console.log('🌐 [INTERFACE] Reports sayfasına yönlendiriliyor');
      navigate('/reports');
    } else if (menuId === 'settings') {
      console.log('🌐 [INTERFACE] Settings sayfasına yönlendiriliyor');
      navigate('/settings');
    } else if (menuId === 'nat-settings') {
      console.log('🌐 [INTERFACE] NAT Settings sayfasına yönlendiriliyor');
      navigate('/nat-settings');
    } else if (menuId === 'dns-management') {
      console.log('🌐 [INTERFACE] DNS Management sayfasına yönlendiriliyor');
      navigate('/dns-management');
    } else if (menuId === 'routes') {
      console.log('🌐 [INTERFACE] Routes sayfasına yönlendiriliyor');
      navigate('/routes');
    } else if (menuId === 'rule-groups') {
      console.log('🌐 [INTERFACE] Rule Groups sayfasına yönlendiriliyor');
      navigate('/rule-groups');
    } else if (menuId === 'logs') {
      console.log('🌐 [INTERFACE] Logs sayfasına yönlendiriliyor');
      navigate('/logs');
    } else if (menuId === 'security-rules') {
      console.log('🌐 [INTERFACE] Security Rules sayfasına yönlendiriliyor');
      navigate('/security-rules');
    } else {
      // Diğer menüler için dashboard'a git
      console.log('🌐 [INTERFACE] Dashboard\'a yönlendiriliyor');
      navigate('/dashboard');
    }
  };

  const StatCard = ({ title, value, icon, color }) => {
    return (
      <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-4 hover:bg-slate-800/70 transition-all duration-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm font-medium mb-1">{title}</p>
            <p className="font-bold text-2xl text-white">{value}</p>
          </div>
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
            {icon}
          </div>
        </div>
      </div>
    );
  };

  const getInterfaceIcon = (type) => {
    switch (type) {
      case 'ethernet':
        return <FaEthernet className="text-blue-400" />;
      case 'wireless':
        return <FaWifi className="text-green-400" />;
      default:
        return <FaNetworkWired className="text-gray-400" />;
    }
  };

  console.log('🌐 [INTERFACE] Component render ediliyor, state:', {
    activeMenu,
    isLoading,
    interfacesCount: interfaces.length
  });

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
                <h2 className="text-xl font-semibold text-white">Ağ Arayüzleri</h2>
                <span className="text-gray-400 text-sm">Network interface yapılandırması ve yönetimi</span>
                <DataPersistenceIndicator />
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => {
                    resetForm();
                    setShowAddModal(true);
                  }}
                  className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <FaPlus className="text-sm" />
                  <span>Yeni Arayüz</span>
                </button>
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
        <main className="p-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <StatCard
              title="Mevcut Ağ Arayüzleri"
              value={interfaces.length}
              icon={<FaNetworkWired />}
              color="text-blue-400 bg-blue-500/10"
            />
            <StatCard
              title="Aktif Arayüzler"
              value={interfaces.filter(i => i.enabled).length}
              icon={<FaCheckCircle />}
              color="text-green-400 bg-green-500/10"
            />
            <StatCard
              title="Statik IP'ler"
              value={interfaces.filter(i => i.ipMode === 'static').length}
              icon={<FaServer />}
              color="text-purple-400 bg-purple-500/10"
            />
          </div>

          {/* Interfaces List */}
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <FaNetworkWired className="text-blue-400 text-xl" />
                <h3 className="text-white font-semibold text-lg">Mevcut Ağ Arayüzleri</h3>
                <span className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full text-xs font-medium">
                  {interfaces.length} adet
                </span>
              </div>
            </div>

            {/* Interfaces Grid */}
            <div className="space-y-4">
              {interfaces.length > 0 ? (
                interfaces.map((iface) => (
                  <div key={iface.id} className={`bg-slate-900/40 rounded-xl p-6 border border-slate-700/30 hover:bg-slate-900/60 transition-colors ${iface.icsEnabled ? 'interface-card-ics' : ''}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <div className="w-12 h-12 bg-slate-700/50 rounded-lg flex items-center justify-center">
                          {getInterfaceIcon(iface.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="text-white font-semibold text-lg">{iface.name}</h4>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              iface.enabled
                                ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                                : 'bg-red-500/20 text-red-300 border border-red-500/30'
                            }`}>
                              {iface.enabled ? 'UP' : 'DOWN'}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              iface.ipMode === 'static'
                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                : 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                            }`}>
                              {iface.ipMode === 'static' ? 'Statik IP' : 'DHCP'}
                            </span>
                            {/* ICS Badge */}
                            {iface.icsEnabled && (
                              <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-500/20 text-green-300 border border-green-500/30">
                                ICS Aktif
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-gray-400">IP Adresi:</span>
                              <p className="text-white font-medium">{iface.ipAddress || 'N/A'}</p>
                            </div>
                            <div>
                              <span className="text-gray-400">Alt Ağ Maskesi:</span>
                              <p className="text-white font-medium">{iface.subnetMask || 'N/A'}</p>
                            </div>
                            <div>
                              <span className="text-gray-400">Ağ Geçidi:</span>
                              <p className="text-white font-medium">{iface.gateway || 'N/A'}</p>
                            </div>
                            <div>
                              <span className="text-gray-400">MTU:</span>
                              <p className="text-white font-medium">{iface.mtuSize || 1500}</p>
                            </div>
                          </div>
                          {iface.vlanId && (
                            <div className="mt-2">
                              <span className="text-gray-400 text-sm">VLAN ID: </span>
                              <span className="text-yellow-300 font-medium">{iface.vlanId}</span>
                            </div>
                          )}
                          {/* ICS Info */}
                          {iface.icsEnabled && (
                            <div className="mt-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                              <p className="text-green-300 text-sm">
                                <strong>Internet Paylaşımı Aktif:</strong> Kaynak {iface.icsSourceInterface} → DHCP {iface.dhcpRangeStart} - {iface.dhcpRangeEnd}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => handleToggleInterface(iface.id, !iface.enabled)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            iface.enabled ? 'bg-green-600' : 'bg-gray-600'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              iface.enabled ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                        <button
                          onClick={() => handleEditInterface(iface)}
                          className="text-blue-400 hover:text-blue-300 p-2 rounded transition-colors"
                          title="Düzenle"
                        >
                          <FaEdit className="text-sm" />
                        </button>
                        <button
                          onClick={() => handleDeleteInterface(iface.id)}
                          className="text-red-400 hover:text-red-300 p-2 rounded transition-colors"
                          title="Sil"
                        >
                          <FaTrash className="text-sm" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <FaNetworkWired className="text-gray-500 text-4xl mb-4 mx-auto" />
                  <h4 className="text-white font-medium mb-2">Henüz Ağ Arayüzü Yok</h4>
                  <p className="text-gray-400 text-sm mb-6">İlk arayüzünü oluştur</p>
                  <button
                    onClick={() => {
                      resetForm();
                      setShowAddModal(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors flex items-center space-x-2 mx-auto"
                  >
                    <FaPlus className="text-sm" />
                    <span>İlk Arayüzünü Oluştur</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Interface Information */}
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6">
            <div className="flex items-center space-x-3 mb-6">
              <FaInfoCircle className="text-blue-400 text-xl" />
              <h3 className="text-white font-semibold text-lg">Ağ Arayüzleri Hakkında</h3>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-white font-medium mb-2">Ağ Arayüzleri:</h4>
                  <p className="text-gray-400 text-sm">Ağ bağlantılarını yönetmek ve yapılandırmak için kullanılır. Her arayüz farklı ağ segmentlerine bağlanabilir.</p>
                </div>
                <div>
                  <h4 className="text-white font-medium mb-2">IP Yapılandırması:</h4>
                  <p className="text-gray-400 text-sm">Statik IP veya DHCP kullanarak ağ adreslemesi yapabilirsiniz. Statik IP sabit adres, DHCP otomatik adres atar.</p>
                </div>
                <div>
                  <h4 className="text-white font-medium mb-2">VLAN Desteği:</h4>
                  <p className="text-gray-400 text-sm">VLAN ID belirterek sanal ağ segmentleri oluşturabilir ve ağ trafiğini izole edebilirsiniz.</p>
                </div>
                <div>
                  <h4 className="text-white font-medium mb-2">Internet Connection Sharing (ICS):</h4>
                  <p className="text-gray-400 text-sm">Bir interface'den gelen internet bağlantısını diğer cihazlara DHCP ile paylaştırabilirsiniz. NAT ve DHCP server otomatik kurulur.</p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Add/Edit Interface Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => {
              setShowAddModal(false);
              resetForm();
            }} />
            <span className="hidden sm:inline-block sm:h-screen sm:align-middle">&#8203;</span>
            <div className="inline-block w-full max-w-2xl transform overflow-hidden rounded-lg bg-slate-800 text-left align-bottom shadow-xl transition-all sm:my-8 sm:align-middle">
              <div className="bg-slate-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-white">
                    {editingInterface ? 'Arayüz Düzenle' : 'Yeni Arayüz Ekle'}
                  </h3>
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      resetForm();
                    }}
                    className="rounded-md bg-slate-800 text-gray-400 hover:text-gray-300 focus:outline-none"
                  >
                    <FaTimes />
                  </button>
                </div>
                <div className="space-y-6">
                  {/* Arayüz Adı */}
                  <div>
                    <label className="block text-gray-300 font-medium mb-2">Arayüz Adı</label>
                    <input
                      type="text"
                      value={newInterface.name}
                      onChange={(e) => setNewInterface(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Ethernet"
                    />
                  </div>

                  {/* Açıklama */}
                  <div>
                    <label className="block text-gray-300 font-medium mb-2">Açıklama</label>
                    <input
                      type="text"
                      value={newInterface.description}
                      onChange={(e) => setNewInterface(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Bu arayüzün açıklaması"
                    />
                  </div>

                  {/* IP Yapılandırma Modu */}
                  <div>
                    <label className="block text-gray-300 font-medium mb-2">IP Yapılandırma Modu</label>
                    <div className="flex space-x-4">
                      <button
                        onClick={() => setNewInterface(prev => ({ ...prev, ipMode: 'static' }))}
                        className={`flex-1 p-3 rounded-lg border transition-colors ${
                          newInterface.ipMode === 'static'
                            ? 'bg-blue-600 border-blue-500 text-white'
                            : 'bg-slate-700/50 border-slate-600 text-gray-300 hover:bg-slate-700'
                        }`}
                      >
                        Statik IP
                      </button>
                      <button
                        onClick={() => setNewInterface(prev => ({ ...prev, ipMode: 'dhcp' }))}
                        className={`flex-1 p-3 rounded-lg border transition-colors ${
                          newInterface.ipMode === 'dhcp'
                            ? 'bg-orange-600 border-orange-500 text-white'
                            : 'bg-slate-700/50 border-slate-600 text-gray-300 hover:bg-slate-700'
                        }`}
                      >
                        DHCP
                      </button>
                    </div>
                  </div>

                  {/* Statik IP Ayarları */}
                  {newInterface.ipMode === 'static' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-gray-300 font-medium mb-2">IP Adresi</label>
                        <input
                          type="text"
                          value={newInterface.ipAddress}
                          onChange={(e) => setNewInterface(prev => ({ ...prev, ipAddress: e.target.value }))}
                          className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="192.168.1.10"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-300 font-medium mb-2">Alt Ağ Maskesi</label>
                        <input
                          type="text"
                          value={newInterface.subnetMask}
                          onChange={(e) => setNewInterface(prev => ({ ...prev, subnetMask: e.target.value }))}
                          className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="255.255.255.0"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-300 font-medium mb-2">Ağ Geçidi</label>
                        <input
                          type="text"
                          value={newInterface.gateway}
                          onChange={(e) => setNewInterface(prev => ({ ...prev, gateway: e.target.value }))}
                          className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="192.168.1.1"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-300 font-medium mb-2">Birincil DNS</label>
                        <input
                          type="text"
                          value={newInterface.primaryDns}
                          onChange={(e) => setNewInterface(prev => ({ ...prev, primaryDns: e.target.value }))}
                          className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="8.8.8.8"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-300 font-medium mb-2">İkincil DNS</label>
                        <input
                          type="text"
                          value={newInterface.secondaryDns}
                          onChange={(e) => setNewInterface(prev => ({ ...prev, secondaryDns: e.target.value }))}
                          className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="8.8.4.4"
                        />
                      </div>
                    </div>
                  )}

                  {/* Gelişmiş Ayarlar */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-300 font-medium mb-2">MTU Boyutu</label>
                      <input
                        type="number"
                        min="576"
                        max="9000"
                        value={newInterface.mtuSize}
                        onChange={(e) => setNewInterface(prev => ({ ...prev, mtuSize: e.target.value }))}
                        className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="1500"
                      />
                      <p className="text-gray-500 text-xs mt-1">576-9000 arası değer girin</p>
                    </div>
                    <div>
                      <label className="block text-gray-300 font-medium mb-2">VLAN ID</label>
                      <input
                        type="number"
                        min="1"
                        max="4094"
                        value={newInterface.vlanId}
                        onChange={(e) => setNewInterface(prev => ({ ...prev, vlanId: e.target.value }))}
                        className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="100"
                      />
                      <p className="text-gray-500 text-xs mt-1">İsteğe bağlı, 1-4094 arası</p>
                    </div>
                  </div>

                  {/* Internet Connection Sharing (ICS) */}
                  {newInterface.ipMode === 'static' && (
                    <div className="border-t border-slate-600 pt-6">
                      <h4 className="text-white font-medium mb-4">Internet Connection Sharing (ICS)</h4>
                      <div className="space-y-4">
                        <div className="flex items-center space-x-3">
                          <label className="flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={newInterface.icsEnabled}
                              onChange={(e) => setNewInterface(prev => ({ ...prev, icsEnabled: e.target.checked }))}
                              className="sr-only"
                            />
                            <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              newInterface.icsEnabled ? 'bg-green-600' : 'bg-gray-600'
                            }`}>
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                  newInterface.icsEnabled ? 'translate-x-6' : 'translate-x-1'
                                }`}
                              />
                            </div>
                            <span className="ml-3 text-gray-300 font-medium">Internet Paylaşımını Etkinleştir</span>
                          </label>
                        </div>
                        {newInterface.icsEnabled && (
                          <>
                            <div>
                              <label className="block text-gray-300 font-medium mb-2">Kaynak Interface (İnternet)</label>
                              <select
                                value={newInterface.icsSourceInterface}
                                onChange={(e) => setNewInterface(prev => ({ ...prev, icsSourceInterface: e.target.value }))}
                                className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              >
                                <option value="">İnternet bağlantısı olan interface'i seçin</option>
                                {availableInterfaces.map((iface) => (
                                  <option key={iface.name} value={iface.name}>
                                    {iface.display_name} ({iface.name})
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-gray-300 font-medium mb-2">DHCP Aralığı Başlangıç</label>
                                <input
                                  type="text"
                                  value={newInterface.dhcpRangeStart}
                                  onChange={(e) => setNewInterface(prev => ({ ...prev, dhcpRangeStart: e.target.value }))}
                                  className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  placeholder="192.168.100.100"
                                />
                              </div>
                              <div>
                                <label className="block text-gray-300 font-medium mb-2">DHCP Aralığı Bitiş</label>
                                <input
                                  type="text"
                                  value={newInterface.dhcpRangeEnd}
                                  onChange={(e) => setNewInterface(prev => ({ ...prev, dhcpRangeEnd: e.target.value }))}
                                  className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  placeholder="192.168.100.200"
                                />
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ICS Bilgilendirmesi */}
                  {newInterface.icsEnabled && (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <FaInfoCircle className="text-green-400 text-lg mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-green-200 font-medium mb-1">Internet Paylaşımı Aktif</p>
                          <p className="text-green-200/80 text-sm">
                            Bu interface diğer cihazlara internet erişimi sağlayacak. Kaynak interface'den gelen internet bağlantısı
                            bu interface üzerinden DHCP ile paylaşılacak. Bu işlem NAT kuralları ve DHCP server kurulumu gerektirir.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Arayüz Etkinleştir */}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300 font-medium">Arayüz Etkinleştir (UP/DOWN Durumu)</span>
                    <button
                      onClick={() => setNewInterface(prev => ({ ...prev, enabled: !prev.enabled }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        newInterface.enabled ? 'bg-green-600' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          newInterface.enabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Arayüz Bilgilendirmesi */}
                <div className="mt-6 bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <FaInfoCircle className="text-blue-400 text-lg mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-blue-200 font-medium mb-1">Ağ Arayüzü Bilgilendirmesi</p>
                      <p className="text-blue-200/80 text-sm">
                        Statik IP yapılandırması manuel ayarlar gerektirir. DHCP otomatik IP atar. VLAN ID sanal ağ segmentleri için kullanılır.
                        ICS özelliği ile internet bağlantınızı diğer cihazlarla paylaşabilirsiniz.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex space-x-3">
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      resetForm();
                    }}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg transition-colors"
                  >
                    İptal
                  </button>
                  <button
                    onClick={editingInterface ? handleUpdateInterface : handleAddInterface}
                    disabled={isSaving}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    {isSaving ? (
                      <>
                        <FaSync className="animate-spin" />
                        <span>{editingInterface ? 'Güncelleniyor...' : 'Oluşturuluyor...'}</span>
                      </>
                    ) : (
                      <>
                        <FaSave />
                        <span>Kaydet</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InterfaceSettings;