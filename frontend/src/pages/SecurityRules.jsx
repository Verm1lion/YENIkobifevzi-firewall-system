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
  FaSearch,
  FaBan,
  FaPlay
} from 'react-icons/fa';
import { securityRulesService } from '../services/securityRulesService';
import './SecurityRules.css';

console.log('🛡️ [SECURITY-RULES] SecurityRules component yüklendi');

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
      const response = await securityRulesService.getDataStatus();
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

const SecurityRules = () => {
  console.log('🛡️ [SECURITY-RULES] SecurityRules component render başladı');
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeMenu, setActiveMenu] = useState('security-rules');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Security Rules State
  const [securityRules, setSecurityRules] = useState([]);
  const [searchRule, setSearchRule] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [ruleGroups, setRuleGroups] = useState([]);
  const [newRule, setNewRule] = useState({
    name: '',
    group: '',
    action: 'İzin Ver',
    protocol: 'TCP',
    port: '',
    sourceIp: '',
    direction: 'Çıkan',
    scheduling: '',
    profile: 'Herhangi',
    priority: '100',
    description: '',
    enabled: true,
    // Zaman Planlaması
    startTime: '',
    endTime: '',
    weekDays: []
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

  const weekDaysOptions = [
    { key: 'mon', label: 'Pzt' },
    { key: 'tue', label: 'Sal' },
    { key: 'wed', label: 'Çar' },
    { key: 'thu', label: 'Per' },
    { key: 'fri', label: 'Cum' },
    { key: 'sat', label: 'Cmt' },
    { key: 'sun', label: 'Paz' }
  ];

  useEffect(() => {
    console.log('🛡️ [SECURITY-RULES] useEffect başladı');
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    fetchSecurityRules();
    fetchRuleGroups();

    return () => {
      console.log('🛡️ [SECURITY-RULES] Component unmount, timer temizleniyor');
      clearInterval(timer);
    };
  }, []);

  const fetchSecurityRules = async () => {
    try {
      console.log('🛡️ [SECURITY-RULES] Security rules data fetch başladı');
      setIsLoading(true);
      const response = await securityRulesService.getSecurityRules();
      if (response.success) {
        console.log('🛡️ [SECURITY-RULES] Security rules data başarıyla alındı:', response.data);
        setSecurityRules(response.data || []);
      }
    } catch (error) {
      console.error('🛡️ [SECURITY-RULES] Security rules data fetch error:', error);
      toast.error('Güvenlik kuralları alınamadı');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRuleGroups = async () => {
    try {
      const response = await securityRulesService.getRuleGroups();
      if (response.success) {
        setRuleGroups(response.data || []);
      }
    } catch (error) {
      console.error('Rule groups fetch error:', error);
      // Set fallback groups
      setRuleGroups([
        { id: '1', name: 'Varsayılan', enabled: true },
        { id: '2', name: 'Web Sunucu', enabled: true },
        { id: '3', name: 'VPN Erişimi', enabled: true }
      ]);
    }
  };

  const handleAddRule = async () => {
    if (!validateRule(newRule)) {
      return;
    }
    try {
      console.log('🛡️ [SECURITY-RULES] Rule ekleniyor:', newRule);
      setIsSaving(true);
      const response = await securityRulesService.createSecurityRule(newRule);
      if (response.success) {
        setSecurityRules(prev => [...prev, response.data]);
        toast.success('Güvenlik kuralı başarıyla oluşturuldu');
        resetForm();
        setShowAddModal(false);
      }
    } catch (error) {
      console.error('Add rule error:', error);
      toast.error('Güvenlik kuralı oluşturulurken hata oluştu');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditRule = (rule) => {
    setEditingRule(rule);
    setNewRule({
      name: rule.name,
      group: rule.group,
      action: rule.action,
      protocol: rule.protocol,
      port: rule.port,
      sourceIp: rule.sourceIp,
      direction: rule.direction,
      scheduling: rule.scheduling,
      profile: rule.profile,
      priority: rule.priority.toString(),
      description: rule.description || '',
      enabled: rule.enabled,
      startTime: rule.startTime || '',
      endTime: rule.endTime || '',
      weekDays: rule.weekDays || []
    });
    setShowAddModal(true);
  };

  const handleUpdateRule = async () => {
    if (!validateRule(newRule)) {
      return;
    }
    try {
      console.log('🛡️ [SECURITY-RULES] Rule güncelleniyor:', editingRule.id, newRule);
      setIsSaving(true);
      const response = await securityRulesService.updateSecurityRule(editingRule.id, newRule);
      if (response.success) {
        setSecurityRules(prev => prev.map(rule =>
          rule.id === editingRule.id
            ? { ...rule, ...newRule, priority: parseInt(newRule.priority), updatedAt: new Date().toISOString() }
            : rule
        ));
        toast.success('Güvenlik kuralı başarıyla güncellendi');
        resetForm();
        setShowAddModal(false);
        setEditingRule(null);
      }
    } catch (error) {
      console.error('Update rule error:', error);
      toast.error('Güvenlik kuralı güncellenirken hata oluştu');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRule = async (ruleId) => {
    if (!window.confirm('Bu güvenlik kuralını silmek istediğinizden emin misiniz?')) {
      return;
    }
    try {
      console.log('🛡️ [SECURITY-RULES] Rule siliniyor:', ruleId);
      const response = await securityRulesService.deleteSecurityRule(ruleId);
      if (response.success) {
        setSecurityRules(prev => prev.filter(rule => rule.id !== ruleId));
        toast.success('Güvenlik kuralı başarıyla silindi');
      }
    } catch (error) {
      console.error('Delete rule error:', error);
      toast.error('Güvenlik kuralı silinirken hata oluştu');
    }
  };

  const handleToggleRule = async (ruleId, enabled) => {
    try {
      const response = await securityRulesService.toggleSecurityRule(ruleId, enabled);
      if (response.success) {
        setSecurityRules(prev => prev.map(rule =>
          rule.id === ruleId ? { ...rule, enabled } : rule
        ));
        toast.success(`Güvenlik kuralı ${enabled ? 'etkinleştirildi' : 'devre dışı bırakıldı'}`);
      }
    } catch (error) {
      console.error('Toggle rule error:', error);
      toast.error('Güvenlik kuralı durumu değiştirilemedi');
    }
  };

  const validateRule = (rule) => {
    if (!rule.name.trim()) {
      toast.error('Kural adı gerekli');
      return false;
    }
    if (!rule.sourceIp.trim()) {
      toast.error('Kaynak IP adresi gerekli');
      return false;
    }

    // Port validation
    if (rule.port && rule.port !== 'Herhangi') {
      const portNum = parseInt(rule.port);
      if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
        toast.error('Geçersiz port numarası (1-65535)');
        return false;
      }
    }

    // Priority validation
    const priorityNum = parseInt(rule.priority);
    if (isNaN(priorityNum) || priorityNum < 1 || priorityNum > 1000) {
      toast.error('Geçersiz öncelik değeri (1-1000)');
      return false;
    }

    return true;
  };

  const resetForm = () => {
    setNewRule({
      name: '',
      group: '',
      action: 'İzin Ver',
      protocol: 'TCP',
      port: '',
      sourceIp: '',
      direction: 'Çıkan',
      scheduling: '',
      profile: 'Herhangi',
      priority: '100',
      description: '',
      enabled: true,
      startTime: '',
      endTime: '',
      weekDays: []
    });
    setEditingRule(null);
  };

  const handleWeekDayToggle = (day) => {
    setNewRule(prev => ({
      ...prev,
      weekDays: prev.weekDays.includes(day)
        ? prev.weekDays.filter(d => d !== day)
        : [...prev.weekDays, day]
    }));
  };

  const handleLogout = async () => {
    try {
      console.log('🛡️ [SECURITY-RULES] Logout başladı');
      await logout();
      toast.success('Başarıyla çıkış yapıldı');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Çıkış yapılırken hata oluştu');
    }
  };

  // GÜNCELLENMİŞ HANDLE MENU CLICK FONKSİYONU (320. satır civarı)
  const handleMenuClick = (menuId) => {
    console.log('🛡️ [SECURITY-RULES] Menu tıklandı:', menuId);
    if (menuId === 'security-rules') {
      console.log('🛡️ [SECURITY-RULES] Security Rules seçildi, activeMenu güncelleniyor');
      setActiveMenu(menuId);
      return;
    }

    // Diğer sayfalara yönlendirmeler
    if (menuId === 'home') {
      console.log('🛡️ [SECURITY-RULES] Ana sayfaya yönlendiriliyor');
      navigate('/dashboard');
    } else if (menuId === 'updates') {
      console.log('🛡️ [SECURITY-RULES] Updates sayfasına yönlendiriliyor');
      navigate('/updates');
    } else if (menuId === 'reports') {
      console.log('🛡️ [SECURITY-RULES] Reports sayfasına yönlendiriliyor');
      navigate('/reports');
    } else if (menuId === 'settings') {
      console.log('🛡️ [SECURITY-RULES] Settings sayfasına yönlendiriliyor');
      navigate('/settings');
    } else if (menuId === 'nat-settings') {
      console.log('🛡️ [SECURITY-RULES] NAT Settings sayfasına yönlendiriliyor');
      navigate('/nat-settings');
    } else if (menuId === 'dns-management') {
      console.log('🛡️ [SECURITY-RULES] DNS Management sayfasına yönlendiriliyor');
      navigate('/dns-management');
    } else if (menuId === 'routes') {
      console.log('🛡️ [SECURITY-RULES] Routes sayfasına yönlendiriliyor');
      navigate('/routes');
    } else if (menuId === 'rule-groups') {
      console.log('🛡️ [SECURITY-RULES] Rule Groups sayfasına yönlendiriliyor');
      navigate('/rule-groups');
    } else if (menuId === 'interface-settings') {
      console.log('🛡️ [SECURITY-RULES] Interface Settings sayfasına yönlendiriliyor');
      navigate('/interface-settings');
    } else {
      // Diğer menüler için dashboard'a git
      console.log('🛡️ [SECURITY-RULES] Dashboard\'a yönlendiriliyor');
      navigate('/dashboard');
    }
  };

  const filteredRules = securityRules.filter(rule =>
    rule.name.toLowerCase().includes(searchRule.toLowerCase()) ||
    rule.sourceIp.toLowerCase().includes(searchRule.toLowerCase()) ||
    rule.action.toLowerCase().includes(searchRule.toLowerCase())
  );

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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  console.log('🛡️ [SECURITY-RULES] Component render ediliyor, state:', {
    activeMenu,
    isLoading,
    rulesCount: securityRules.length
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
                <h2 className="text-xl font-semibold text-white">Güvenlik Kuralları</h2>
                <span className="text-gray-400 text-sm">Yeni Kural Ekle</span>
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
                  <span>Yeni Kural Ekle</span>
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
              title="Aktif Kurallar"
              value={`${securityRules.filter(r => r.enabled).length} Adet`}
              icon={<FaShieldAlt />}
              color="text-green-400 bg-green-500/10"
            />
            <StatCard
              title="Toplam Kurallar"
              value={securityRules.length}
              icon={<FaCog />}
              color="text-blue-400 bg-blue-500/10"
            />
            <StatCard
              title="Engelleme Kuralları"
              value={securityRules.filter(r => r.action === 'Engelle').length}
              icon={<FaBan />}
              color="text-red-400 bg-red-500/10"
            />
          </div>

          {/* Rules List */}
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <FaShieldAlt className="text-blue-400 text-xl" />
                <h3 className="text-white font-semibold text-lg">Aktif Kurallar ({filteredRules.filter(r => r.enabled).length} Adet)</h3>
              </div>
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                  <input
                    type="text"
                    placeholder="Kural ara..."
                    value={searchRule}
                    onChange={(e) => setSearchRule(e.target.value)}
                    className="bg-slate-700/50 border border-slate-600 rounded-lg px-10 py-2 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Rules Table */}
            <div className="overflow-x-auto">
              {filteredRules.length > 0 ? (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700/50">
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Kural Adı</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Grup</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">İşlem</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Protokol</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Port</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Kaynak IP</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Yön</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Zamanlama</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Durum</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRules.map((rule) => (
                      <tr key={rule.id} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                        <td className="py-3 px-4">
                          <div className="text-white font-medium">{rule.name}</div>
                          <div className="text-gray-400 text-xs">Öncelik: {rule.priority}</div>
                        </td>
                        <td className="py-3 px-4 text-gray-300">{rule.group || 'Seçiniz'}</td>
                        <td className="py-3 px-4">
                          <span className={`badge ${rule.action === 'İzin Ver' ? 'action-allow' : 'action-block'}`}>
                            {rule.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-300">{rule.protocol}</td>
                        <td className="py-3 px-4 text-gray-300">{rule.port || 'Herhangi'}</td>
                        <td className="py-3 px-4 text-gray-300">{rule.sourceIp}</td>
                        <td className="py-3 px-4 text-gray-300">{rule.direction}</td>
                        <td className="py-3 px-4 text-gray-300">
                          {rule.startTime && rule.endTime
                            ? `${rule.startTime} - ${rule.endTime}`
                            : 'Her zaman'
                          }
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleToggleRule(rule.id, !rule.enabled)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              rule.enabled ? 'bg-green-600' : 'bg-gray-600'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                rule.enabled ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleEditRule(rule)}
                              className="text-blue-400 hover:text-blue-300 p-1 rounded transition-colors"
                              title="Düzenle"
                            >
                              <FaEdit className="text-sm" />
                            </button>
                            <button
                              onClick={() => handleDeleteRule(rule.id)}
                              className="text-red-400 hover:text-red-300 p-1 rounded transition-colors"
                              title="Sil"
                            >
                              <FaTrash className="text-sm" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-12">
                  <FaShieldAlt className="text-gray-500 text-4xl mb-4 mx-auto" />
                  <h4 className="text-white font-medium mb-2">
                    {searchRule ? 'Arama kriterine uygun kural bulunamadı' : 'Henüz güvenlik kuralı yok'}
                  </h4>
                  <p className="text-gray-400 text-sm mb-6">
                    {searchRule
                      ? 'Farklı arama terimleri deneyin'
                      : 'İlk güvenlik kuralını oluşturmak için yukarıdaki butonu kullanın'
                    }
                  </p>
                  {!searchRule && (
                    <button
                      onClick={() => {
                        resetForm();
                        setShowAddModal(true);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors flex items-center space-x-2 mx-auto"
                    >
                      <FaPlus className="text-sm" />
                      <span>İlk Kuralı Oluştur</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Security Rules Information */}
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6">
            <div className="flex items-center space-x-3 mb-6">
              <FaInfoCircle className="text-blue-400 text-xl" />
              <h3 className="text-white font-semibold text-lg">Güvenlik Kuralları Hakkında</h3>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-white font-medium mb-2">Güvenlik Kuralları:</h4>
                  <p className="text-gray-400 text-sm">Ağ trafiğini kontrol etmek ve güvenliği sağlamak için kullanılan kurallar. Her kural belirli kriterlere göre trafiği engeller veya izin verir.</p>
                </div>
                <div>
                  <h4 className="text-white font-medium mb-2">Kural Önceliği:</h4>
                  <p className="text-gray-400 text-sm">Düşük sayısal değer yüksek öncelik anlamına gelir. Kurallar öncelik sırasına göre işlenir ve ilk eşleşen kural uygulanır.</p>
                </div>
                <div>
                  <h4 className="text-white font-medium mb-2">Yön Kontrolü:</h4>
                  <p className="text-gray-400 text-sm">Gelen ve çıkan trafik için ayrı kurallar tanımlanabilir. Bu sayede ağ güvenliği her iki yönde de kontrol edilir.</p>
                </div>
                <div>
                  <h4 className="text-white font-medium mb-2">Zaman Planlaması:</h4>
                  <p className="text-gray-400 text-sm">Kuralları belirli saatler ve günlerde aktif hale getirebilirsiniz. Bu özellik çalışma saatleri gibi zaman kısıtlamaları için kullanışlıdır.</p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Add/Edit Rule Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => {
              setShowAddModal(false);
              resetForm();
            }} />
            <span className="hidden sm:inline-block sm:h-screen sm:align-middle">&#8203;</span>
            <div className="inline-block w-full max-w-4xl transform overflow-hidden rounded-lg bg-slate-800 text-left align-bottom shadow-xl transition-all sm:my-8 sm:align-middle">
              <div className="bg-slate-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-white">
                    {editingRule ? 'Güvenlik Kuralını Düzenle' : 'Yeni Güvenlik Kuralı Ekle'}
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
                  {/* Temel Bilgiler */}
                  <div className="form-row">
                    <div className="form-group">
                      <label>Kural Adı</label>
                      <input
                        type="text"
                        value={newRule.name}
                        onChange={(e) => setNewRule(prev => ({ ...prev, name: e.target.value }))}
                        className="form-input"
                        placeholder="Web Sunucu Erişimi"
                      />
                    </div>
                    <div className="form-group">
                      <label>Grup</label>
                      <select
                        value={newRule.group}
                        onChange={(e) => setNewRule(prev => ({ ...prev, group: e.target.value }))}
                        className="form-select"
                      >
                        <option value="">Seçiniz</option>
                        {ruleGroups.map((group) => (
                          <option key={group.id} value={group.name}>
                            {group.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* İşlem ve Protokol */}
                  <div className="form-row">
                    <div className="form-group">
                      <label>İşlem</label>
                      <select
                        value={newRule.action}
                        onChange={(e) => setNewRule(prev => ({ ...prev, action: e.target.value }))}
                        className="form-select"
                      >
                        <option value="İzin Ver">İzin Ver</option>
                        <option value="Engelle">Engelle</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Protokol</label>
                      <select
                        value={newRule.protocol}
                        onChange={(e) => setNewRule(prev => ({ ...prev, protocol: e.target.value }))}
                        className="form-select"
                      >
                        <option value="TCP">TCP</option>
                        <option value="UDP">UDP</option>
                        <option value="Her ikisi">Her ikisi</option>
                      </select>
                    </div>
                  </div>

                  {/* Port ve Kaynak IP */}
                  <div className="form-row">
                    <div className="form-group">
                      <label>Port</label>
                      <input
                        type="text"
                        value={newRule.port}
                        onChange={(e) => setNewRule(prev => ({ ...prev, port: e.target.value }))}
                        className="form-input"
                        placeholder="80, 443, 1000-2000 veya Herhangi"
                      />
                    </div>
                    <div className="form-group">
                      <label>Kaynak IP</label>
                      <input
                        type="text"
                        value={newRule.sourceIp}
                        onChange={(e) => setNewRule(prev => ({ ...prev, sourceIp: e.target.value }))}
                        className="form-input"
                        placeholder="192.168.1.100 veya 192.168.1.0/24"
                      />
                    </div>
                  </div>

                  {/* Yön ve Profil */}
                  <div className="form-row">
                    <div className="form-group">
                      <label>Yön</label>
                      <select
                        value={newRule.direction}
                        onChange={(e) => setNewRule(prev => ({ ...prev, direction: e.target.value }))}
                        className="form-select"
                      >
                        <option value="Çıkan">Çıkan</option>
                        <option value="Gelen">Gelen</option>
                        <option value="Her ikisi">Her ikisi</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Profil</label>
                      <select
                        value={newRule.profile}
                        onChange={(e) => setNewRule(prev => ({ ...prev, profile: e.target.value }))}
                        className="form-select"
                      >
                        <option value="Herhangi">Herhangi</option>
                        <option value="Özel">Özel</option>
                        <option value="Genel">Genel</option>
                        <option value="Domain">Domain</option>
                      </select>
                    </div>
                  </div>

                  {/* Öncelik */}
                  <div className="form-row">
                    <div className="form-group">
                      <label>Öncelik</label>
                      <input
                        type="number"
                        min="1"
                        max="1000"
                        value={newRule.priority}
                        onChange={(e) => setNewRule(prev => ({ ...prev, priority: e.target.value }))}
                        className="form-input"
                        placeholder="100"
                      />
                      <div className="flex items-center space-x-2 mt-2">
                        <button
                          type="button"
                          onClick={() => setNewRule(prev => ({ ...prev, priority: Math.max(1, parseInt(prev.priority || 100) - 10).toString() }))}
                          className="bg-slate-600 hover:bg-slate-500 text-white px-3 py-1 rounded text-sm"
                        >
                          -
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewRule(prev => ({ ...prev, priority: Math.min(1000, parseInt(prev.priority || 100) + 10).toString() }))}
                          className="bg-slate-600 hover:bg-slate-500 text-white px-3 py-1 rounded text-sm"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Açıklama</label>
                      <textarea
                        value={newRule.description}
                        onChange={(e) => setNewRule(prev => ({ ...prev, description: e.target.value }))}
                        className="form-textarea"
                        placeholder="Kural hakkında açıklama..."
                        rows="3"
                      />
                    </div>
                  </div>

                  {/* Zaman Planlaması */}
                  <div className="time-planning-section">
                    <div className="time-planning-header">
                      <h4 className="text-white font-medium mb-2">Zaman Planlaması</h4>
                      <p className="text-gray-400 text-sm">Kuralın hangi saatlerde ve günlerde aktif olacağını belirleyin</p>
                    </div>
                    <div className="time-inputs">
                      <div className="form-group">
                        <label>Başlangıç Saati</label>
                        <input
                          type="time"
                          value={newRule.startTime}
                          onChange={(e) => setNewRule(prev => ({ ...prev, startTime: e.target.value }))}
                          className="form-input"
                        />
                      </div>
                      <div className="form-group">
                        <label>Bitiş Saati</label>
                        <input
                          type="time"
                          value={newRule.endTime}
                          onChange={(e) => setNewRule(prev => ({ ...prev, endTime: e.target.value }))}
                          className="form-input"
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Haftanın Günleri</label>
                      <div className="days-selection">
                        {weekDaysOptions.map((day) => (
                          <button
                            key={day.key}
                            type="button"
                            onClick={() => handleWeekDayToggle(day.key)}
                            className={`day-button ${newRule.weekDays.includes(day.key) ? 'selected' : ''}`}
                          >
                            {day.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Kural Etkin */}
                  <div className="toggle-container">
                    <span className="toggle-label">Kural Etkin</span>
                    <button
                      type="button"
                      onClick={() => setNewRule(prev => ({ ...prev, enabled: !prev.enabled }))}
                      className={`toggle-switch ${newRule.enabled ? 'enabled' : ''}`}
                    >
                      <span className="toggle-switch-knob" />
                    </button>
                  </div>
                </div>

                {/* Bilgilendirme */}
                <div className="info-box">
                  <div className="info-content">
                    <FaInfoCircle className="info-icon" />
                    <div>
                      <p className="info-text">Güvenlik Kuralı Bilgilendirmesi</p>
                      <p className="info-description">
                        Düşük öncelik numarası yüksek öncelik anlamına gelir. Kurallar sırayla işlenir ve ilk eşleşen kural uygulanır.
                        Zaman planlaması boş bırakılırsa kural her zaman aktif olur.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="modal-actions">
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      resetForm();
                    }}
                    className="modal-button secondary"
                  >
                    Vazgeç
                  </button>
                  <button
                    onClick={editingRule ? handleUpdateRule : handleAddRule}
                    disabled={isSaving}
                    className="modal-button primary"
                  >
                    {isSaving ? (
                      <>
                        <FaSync className="animate-spin" />
                        <span>{editingRule ? 'Güncelleniyor...' : 'Ekleniyor...'}</span>
                      </>
                    ) : (
                      <>
                        <FaSave />
                        <span>{editingRule ? 'Güncelle' : 'Ekle'}</span>
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

export default SecurityRules;