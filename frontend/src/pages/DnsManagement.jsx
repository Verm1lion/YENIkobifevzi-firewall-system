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
  FaBan,
  FaLink,
  FaPlus,
  FaSearch,
  FaDownload,
  FaInfoCircle,
  FaSave,
  FaTrash,
  FaEdit,
  FaEye,
  FaTimes
} from 'react-icons/fa';
import { dnsService } from '../services/dnsService';
import './DnsManagement.css';

console.log('🌐 [DNS] DnsManagement component yüklendi');

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
      const response = await dnsService.getDataStatus();
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

const DnsManagement = () => {
  console.log('🌐 [DNS] DnsManagement component render başladı');

  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeMenu, setActiveMenu] = useState('dns-management');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // DNS Management State
  const [dnsConfig, setDnsConfig] = useState({
    blockedDomains: [],
    wildcardRules: [],
    allowedDomains: [],
    adBlockerEnabled: true,
    dohBlocked: false,
    adBlockList: 'https://somehost.com/adblock-list.txt'
  });

  const [searchDomain, setSearchDomain] = useState('');
  const [activeTab, setActiveTab] = useState('blocked');
  const [showAddModal, setShowAddModal] = useState(false);
  const [domainToAdd, setDomainToAdd] = useState('');
  const [domainType, setDomainType] = useState('blocked');

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
    console.log('🌐 [DNS] useEffect başladı');

    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    fetchDnsConfig();

    return () => {
      console.log('🌐 [DNS] Component unmount, timer temizleniyor');
      clearInterval(timer);
    };
  }, []);

  const fetchDnsConfig = async () => {
    try {
      console.log('🌐 [DNS] DNS config fetch başladı');
      setIsLoading(true);
      const response = await dnsService.getDnsConfig();
      if (response.success) {
        console.log('🌐 [DNS] DNS config başarıyla alındı:', response.data);
        setDnsConfig(response.data);
      }
    } catch (error) {
      console.error('🌐 [DNS] DNS config fetch error:', error);
      toast.error('DNS konfigürasyonu alınamadı');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddDomain = async () => {
    if (!domainToAdd.trim()) {
      toast.error('Domain adı boş olamaz');
      return;
    }

    try {
      console.log('🌐 [DNS] Domain ekleniyor:', { domainToAdd, domainType });
      setIsSaving(true);
      const fieldName = domainType === 'blocked' ? 'blockedDomains' :
                       domainType === 'wildcard' ? 'wildcardRules' : 'allowedDomains';

      const newConfig = {
        ...dnsConfig,
        [fieldName]: [...dnsConfig[fieldName], domainToAdd.trim()]
      };

      const response = await dnsService.updateDnsConfig(newConfig);
      if (response.success) {
        setDnsConfig(newConfig);
        toast.success('Domain başarıyla eklendi');
        setDomainToAdd('');
        setShowAddModal(false);
      }
    } catch (error) {
      console.error('Add domain error:', error);
      toast.error('Domain eklenirken hata oluştu');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveDomain = async (domain, type) => {
    try {
      console.log('🌐 [DNS] Domain kaldırılıyor:', { domain, type });
      const fieldName = type === 'blocked' ? 'blockedDomains' :
                       type === 'wildcard' ? 'wildcardRules' : 'allowedDomains';

      const newConfig = {
        ...dnsConfig,
        [fieldName]: dnsConfig[fieldName].filter(d => d !== domain)
      };

      const response = await dnsService.updateDnsConfig(newConfig);
      if (response.success) {
        setDnsConfig(newConfig);
        toast.success('Domain başarıyla kaldırıldı');
      }
    } catch (error) {
      console.error('Remove domain error:', error);
      toast.error('Domain kaldırılırken hata oluştu');
    }
  };

  const handleToggleAdBlocker = async () => {
    try {
      const newConfig = {
        ...dnsConfig,
        adBlockerEnabled: !dnsConfig.adBlockerEnabled
      };

      const response = await dnsService.updateDnsConfig(newConfig);
      if (response.success) {
        setDnsConfig(newConfig);
        toast.success(`Reklam/Tracker engelleyici ${newConfig.adBlockerEnabled ? 'açıldı' : 'kapatıldı'}`);
      }
    } catch (error) {
      console.error('Toggle ad blocker error:', error);
      toast.error('Ayar değiştirilemedi');
    }
  };

  const handleToggleDohBlocking = async () => {
    try {
      const newConfig = {
        ...dnsConfig,
        dohBlocked: !dnsConfig.dohBlocked
      };

      const response = await dnsService.updateDnsConfig(newConfig);
      if (response.success) {
        setDnsConfig(newConfig);
        toast.success(`DNS over HTTPS engelleme ${newConfig.dohBlocked ? 'açıldı' : 'kapatıldı'}`);
      }
    } catch (error) {
      console.error('Toggle DoH blocking error:', error);
      toast.error('Ayar değiştirilemedi');
    }
  };

  const handleDownloadAdBlockList = async () => {
    if (!dnsConfig.adBlockList.trim()) {
      toast.error('Liste URL\'si boş olamaz');
      return;
    }

    try {
      setIsSaving(true);
      const response = await dnsService.downloadAdBlockList(dnsConfig.adBlockList);
      if (response.success) {
        toast.success('Reklam engelleme listesi başarıyla indirildi');
        await fetchDnsConfig(); // Refresh config
      }
    } catch (error) {
      console.error('Download ad block list error:', error);
      toast.error('Liste indirilemedi');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      console.log('🌐 [DNS] Logout başladı');
      await logout();
      toast.success('Başarıyla çıkış yapıldı');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Çıkış yapılırken hata oluştu');
    }
  };

  const handleMenuClick = (menuId) => {
    console.log('🌐 [DNS] Menu tıklandı:', menuId);

    // DNS Management'ta kalmak için
    if (menuId === 'dns-management') {
      console.log('🌐 [DNS] DNS Management seçildi, activeMenu güncelleniyor');
      setActiveMenu(menuId);
      return;
    }

    // Diğer sayfalara yönlendirmeler
    if (menuId === 'home') {
      console.log('🌐 [DNS] Ana sayfaya yönlendiriliyor');
      navigate('/dashboard');
    } else if (menuId === 'updates') {
      console.log('🌐 [DNS] Updates sayfasına yönlendiriliyor');
      navigate('/updates');
    } else if (menuId === 'reports') {
      console.log('🌐 [DNS] Reports sayfasına yönlendiriliyor');
      navigate('/reports');
    } else if (menuId === 'settings') {
      console.log('🌐 [DNS] Settings sayfasına yönlendiriliyor');
      navigate('/settings');
    } else if (menuId === 'nat-settings') {
      console.log('🌐 [DNS] NAT Settings sayfasına yönlendiriliyor');
      navigate('/nat-settings');
    } else {
      // Diğer menüler için dashboard'a git
      console.log('🌐 [DNS] Dashboard\'a yönlendiriliyor');
      navigate('/dashboard');
    }
  };

  const filteredDomains = (domains, type) => {
    if (!searchDomain) return domains || [];
    return (domains || []).filter(domain =>
      domain.toLowerCase().includes(searchDomain.toLowerCase())
    );
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

  console.log('🌐 [DNS] Component render ediliyor, state:', {
    activeMenu,
    isLoading,
    dnsConfigLength: dnsConfig.blockedDomains?.length || 0
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
                <h2 className="text-xl font-semibold text-white">DNS Yönetimi</h2>
                <span className="text-gray-400 text-sm">Domain engelleme, reklam filtreleme ve DNS güvenliği</span>
                <DataPersistenceIndicator />
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <FaPlus className="text-sm" />
                  <span>Yeni Domain</span>
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
              title="Engelli Domainler"
              value={dnsConfig.blockedDomains?.length || 0}
              icon={<FaBan />}
              color="text-red-400 bg-red-500/10"
            />
            <StatCard
              title="Wildcard Kurallar"
              value={dnsConfig.wildcardRules?.length || 0}
              icon={<FaLink />}
              color="text-orange-400 bg-orange-500/10"
            />
            <StatCard
              title="Seçili Domainler"
              value={dnsConfig.allowedDomains?.length || 0}
              icon={<FaCheckCircle />}
              color="text-blue-400 bg-blue-500/10"
            />
          </div>

          {/* Domain Lists */}
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <FaBan className="text-red-400 text-xl" />
                <h3 className="text-white font-semibold text-lg">Engelli Domainler</h3>
              </div>
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                  <input
                    type="text"
                    placeholder="Domain ara..."
                    value={searchDomain}
                    onChange={(e) => setSearchDomain(e.target.value)}
                    className="bg-slate-700/50 border border-slate-600 rounded-lg px-10 py-2 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex bg-slate-700/50 rounded-lg p-1 mb-6">
              <button
                onClick={() => setActiveTab('blocked')}
                className={`px-4 py-2 text-sm rounded-md transition-all ${
                  activeTab === 'blocked'
                    ? 'bg-red-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Engelli Domainler
              </button>
              <button
                onClick={() => setActiveTab('wildcard')}
                className={`px-4 py-2 text-sm rounded-md transition-all ${
                  activeTab === 'wildcard'
                    ? 'bg-orange-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Wildcard Kurallar
              </button>
              <button
                onClick={() => setActiveTab('allowed')}
                className={`px-4 py-2 text-sm rounded-md transition-all ${
                  activeTab === 'allowed'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Seçili Domainler
              </button>
            </div>

            {/* Domain List */}
            <div className="space-y-3">
              {activeTab === 'blocked' && (
                <>
                  {filteredDomains(dnsConfig.blockedDomains || [], 'blocked').length > 0 ? (
                    filteredDomains(dnsConfig.blockedDomains || [], 'blocked').map((domain, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-slate-900/30 rounded-lg hover:bg-slate-900/50 transition-colors">
                        <div className="flex items-center space-x-3">
                          <FaBan className="text-red-400" />
                          <span className="text-white font-medium">{domain}</span>
                          <span className="text-red-300 text-xs bg-red-500/20 px-2 py-1 rounded-full">Engelli</span>
                        </div>
                        <button
                          onClick={() => handleRemoveDomain(domain, 'blocked')}
                          className="text-red-400 hover:text-red-300 p-2 rounded transition-colors"
                        >
                          <FaTrash className="text-sm" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <FaBan className="text-gray-500 text-3xl mb-3 mx-auto" />
                      <h4 className="text-white font-medium mb-2">Henüz engelli domain yok</h4>
                      <p className="text-gray-400 text-sm mb-4">İlk domain'i engellemek için yukarıdaki butonu kullanın</p>
                      <button
                        onClick={() => {
                          setDomainType('blocked');
                          setShowAddModal(true);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                      >
                        İlk Domain'i Engelle
                      </button>
                    </div>
                  )}
                </>
              )}

              {activeTab === 'wildcard' && (
                <>
                  {filteredDomains(dnsConfig.wildcardRules || [], 'wildcard').length > 0 ? (
                    filteredDomains(dnsConfig.wildcardRules || [], 'wildcard').map((rule, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-slate-900/30 rounded-lg hover:bg-slate-900/50 transition-colors">
                        <div className="flex items-center space-x-3">
                          <FaLink className="text-orange-400" />
                          <span className="text-white font-medium">{rule}</span>
                          <span className="text-orange-300 text-xs bg-orange-500/20 px-2 py-1 rounded-full">Wildcard</span>
                        </div>
                        <button
                          onClick={() => handleRemoveDomain(rule, 'wildcard')}
                          className="text-red-400 hover:text-red-300 p-2 rounded transition-colors"
                        >
                          <FaTrash className="text-sm" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <FaLink className="text-gray-500 text-3xl mb-3 mx-auto" />
                      <h4 className="text-white font-medium mb-2">Henüz wildcard kuralı yok</h4>
                      <p className="text-gray-400 text-sm">Wildcard kuralları ile tüm alt domainleri engelleyebilirsiniz</p>
                    </div>
                  )}
                </>
              )}

              {activeTab === 'allowed' && (
                <>
                  {filteredDomains(dnsConfig.allowedDomains || [], 'allowed').length > 0 ? (
                    filteredDomains(dnsConfig.allowedDomains || [], 'allowed').map((domain, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-slate-900/30 rounded-lg hover:bg-slate-900/50 transition-colors">
                        <div className="flex items-center space-x-3">
                          <FaCheckCircle className="text-green-400" />
                          <span className="text-white font-medium">{domain}</span>
                          <span className="text-green-300 text-xs bg-green-500/20 px-2 py-1 rounded-full">İzinli</span>
                        </div>
                        <button
                          onClick={() => handleRemoveDomain(domain, 'allowed')}
                          className="text-red-400 hover:text-red-300 p-2 rounded transition-colors"
                        >
                          <FaTrash className="text-sm" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <FaCheckCircle className="text-gray-500 text-3xl mb-3 mx-auto" />
                      <h4 className="text-white font-medium mb-2">Henüz izinli domain yok</h4>
                      <p className="text-gray-400 text-sm">İzinli domainler diğer kurallardan muaf tutulur</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Ad/Tracker Blocker & DoH Settings */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
            {/* Ad/Tracker Blocker */}
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6">
              <div className="flex items-center space-x-3 mb-6">
                <FaShieldAlt className="text-yellow-400 text-xl" />
                <h3 className="text-white font-semibold text-lg">Reklam/Tracker Engelleyici</h3>
              </div>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300 font-medium">Reklam Engelleyici</span>
                  <button
                    onClick={handleToggleAdBlocker}
                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 ${
                      dnsConfig.adBlockerEnabled ? 'bg-green-600' : 'bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-200 ${
                        dnsConfig.adBlockerEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                <div>
                  <label className="text-gray-300 font-medium mb-3 block">Liste İndir ve Ekle</label>
                  <div className="flex space-x-2">
                    <input
                      type="url"
                      value={dnsConfig.adBlockList || 'https://somehost.com/adblock-list.txt'}
                      onChange={(e) => setDnsConfig(prev => ({ ...prev, adBlockList: e.target.value }))}
                      className="flex-1 bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Liste URL'sini girin..."
                    />
                    <button
                      onClick={handleDownloadAdBlockList}
                      disabled={isSaving}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg transition-colors disabled:opacity-50 flex items-center space-x-2"
                    >
                      {isSaving ? <FaSync className="animate-spin" /> : <FaDownload />}
                      <span>Liste İndir ve Ekle</span>
                    </button>
                  </div>
                  <p className="text-gray-500 text-xs mt-2">EasyList formatındaki blokaj listelerini otomatik olarak indirir</p>
                </div>
              </div>
            </div>

            {/* DNS over HTTPS Blocking */}
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6">
              <div className="flex items-center space-x-3 mb-6">
                <FaExclamationTriangle className="text-red-400 text-xl" />
                <h3 className="text-white font-semibold text-lg">DNS over HTTPS Engelleme</h3>
              </div>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-gray-300 font-medium">DoH Sunucularını Engelle</span>
                    <p className="text-gray-500 text-sm mt-1">Şifreli DNS trafiğini engeller</p>
                  </div>
                  <button
                    onClick={handleToggleDohBlocking}
                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 ${
                      dnsConfig.dohBlocked ? 'bg-red-600' : 'bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-200 ${
                        dnsConfig.dohBlocked ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <FaExclamationTriangle className="text-yellow-400 text-lg mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-yellow-200 font-medium mb-1">Dikkat</p>
                      <p className="text-yellow-200/80 text-sm">
                        DoH engellemesi, Google DNS, Cloudflare DNS gibi şifreli DNS servislerini engeller. Bu, DNS filtrelemeni bypass etmeye çalışan uygulamaları durdurur.
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleToggleDohBlocking()}
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
                >
                  <FaBan />
                  <span>DoH Sunucularını Engelle</span>
                </button>
              </div>
            </div>
          </div>

          {/* DNS Filtering Information */}
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6">
            <div className="flex items-center space-x-3 mb-6">
              <FaInfoCircle className="text-blue-400 text-xl" />
              <h3 className="text-white font-semibold text-lg">DNS Filtreleme Hakkında</h3>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-white font-medium mb-2">Domain Engelleme:</h4>
                  <p className="text-gray-400 text-sm">Belirtilen web sitelerine erişimi DNS seviyesinde engeller. Bu yaklaşım ağ adresleme seviyesinde çalışır.</p>
                </div>
                <div>
                  <h4 className="text-white font-medium mb-2">Wildcard Engelleme:</h4>
                  <p className="text-gray-400 text-sm">*.example.com formatında tüm alt domainleri ve sıkıştırılmış example.com gibi belirttikleri engeller. Örneğin ad.example.com, tracker.example.com gibi adresleri kapsar.</p>
                </div>
                <div>
                  <h4 className="text-white font-medium mb-2">Adblock Listeleri:</h4>
                  <p className="text-gray-400 text-sm">EasyList, AdGuard gibi yaygın reklam engelleme listelerini otomatik olarak indirip uygular.</p>
                </div>
                <div>
                  <h4 className="text-white font-medium mb-2">DoH Engelleme:</h4>
                  <p className="text-gray-400 text-sm">DNS over HTTPS trafiğini engeller, filtreleme bypass etmeye çalışan uygulamaları durdurur.</p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Add Domain Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowAddModal(false)} />
            <span className="hidden sm:inline-block sm:h-screen sm:align-middle">&#8203;</span>
            <div className="inline-block w-full max-w-md transform overflow-hidden rounded-lg bg-slate-800 text-left align-bottom shadow-xl transition-all sm:my-8 sm:align-middle">
              <div className="bg-slate-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-white">Yeni Domain Ekle</h3>
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="rounded-md bg-slate-800 text-gray-400 hover:text-gray-300 focus:outline-none"
                  >
                    <FaTimes />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-300 font-medium mb-2">Domain Adı</label>
                    <input
                      type="text"
                      value={domainToAdd}
                      onChange={(e) => setDomainToAdd(e.target.value)}
                      className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 font-medium mb-2">Kural Tipi</label>
                    <select
                      value={domainType}
                      onChange={(e) => setDomainType(e.target.value)}
                      className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="blocked">Engelli Domain</option>
                      <option value="wildcard">Wildcard Kural</option>
                      <option value="allowed">İzinli Domain</option>
                    </select>
                  </div>
                </div>
                <div className="mt-6 flex space-x-3">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg transition-colors"
                  >
                    İptal
                  </button>
                  <button
                    onClick={handleAddDomain}
                    disabled={isSaving}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isSaving ? 'Ekleniyor...' : 'Ekle'}
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

export default DnsManagement;