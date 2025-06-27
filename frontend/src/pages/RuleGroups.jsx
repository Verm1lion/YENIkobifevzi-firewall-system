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
  FaEye,
  FaBan,
  FaPlay
} from 'react-icons/fa';
import { ruleGroupsService } from '../services/ruleGroupsService';
import './RuleGroups.css';

console.log('⚙️ [RULE-GROUPS] RuleGroups component yüklendi');

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
      const response = await ruleGroupsService.getDataStatus();
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

const RuleGroups = () => {
  console.log('⚙️ [RULE-GROUPS] RuleGroups component render başladı');
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeMenu, setActiveMenu] = useState('rule-groups');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Rule Groups State
  const [ruleGroups, setRuleGroups] = useState([]);
  const [searchGroup, setSearchGroup] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingGroup, setViewingGroup] = useState(null);
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    enabled: true
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
    console.log('⚙️ [RULE-GROUPS] useEffect başladı');
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    fetchRuleGroups();

    return () => {
      console.log('⚙️ [RULE-GROUPS] Component unmount, timer temizleniyor');
      clearInterval(timer);
    };
  }, []);

  const fetchRuleGroups = async () => {
    try {
      console.log('⚙️ [RULE-GROUPS] Rule groups data fetch başladı');
      setIsLoading(true);
      const response = await ruleGroupsService.getRuleGroups();
      if (response.success) {
        console.log('⚙️ [RULE-GROUPS] Rule groups data başarıyla alındı:', response.data);
        setRuleGroups(response.data || []);
      }
    } catch (error) {
      console.error('⚙️ [RULE-GROUPS] Rule groups data fetch error:', error);
      toast.error('Kural grupları alınamadı');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddGroup = async () => {
    if (!validateGroup(newGroup)) {
      return;
    }
    try {
      console.log('⚙️ [RULE-GROUPS] Group ekleniyor:', newGroup);
      setIsSaving(true);
      const response = await ruleGroupsService.createRuleGroup(newGroup);
      if (response.success) {
        setRuleGroups(prev => [...prev, response.data]);
        toast.success('Kural grubu başarıyla oluşturuldu');
        resetForm();
        setShowAddModal(false);
      }
    } catch (error) {
      console.error('Add group error:', error);
      toast.error('Kural grubu oluşturulurken hata oluştu');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditGroup = (group) => {
    setEditingGroup(group);
    setNewGroup({
      name: group.name,
      description: group.description,
      enabled: group.enabled
    });
    setShowAddModal(true);
  };

  const handleUpdateGroup = async () => {
    if (!validateGroup(newGroup)) {
      return;
    }
    try {
      console.log('⚙️ [RULE-GROUPS] Group güncelleniyor:', editingGroup.id, newGroup);
      setIsSaving(true);
      const response = await ruleGroupsService.updateRuleGroup(editingGroup.id, newGroup);
      if (response.success) {
        setRuleGroups(prev => prev.map(group =>
          group.id === editingGroup.id
            ? { ...group, ...newGroup, updatedAt: new Date().toISOString() }
            : group
        ));
        toast.success('Kural grubu başarıyla güncellendi');
        resetForm();
        setShowAddModal(false);
        setEditingGroup(null);
      }
    } catch (error) {
      console.error('Update group error:', error);
      toast.error('Kural grubu güncellenirken hata oluştu');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteGroup = async (groupId) => {
    if (!window.confirm('Bu kural grubunu silmek istediğinizden emin misiniz?')) {
      return;
    }
    try {
      console.log('⚙️ [RULE-GROUPS] Group siliniyor:', groupId);
      const response = await ruleGroupsService.deleteRuleGroup(groupId);
      if (response.success) {
        setRuleGroups(prev => prev.filter(group => group.id !== groupId));
        toast.success('Kural grubu başarıyla silindi');
      }
    } catch (error) {
      console.error('Delete group error:', error);
      toast.error('Kural grubu silinirken hata oluştu');
    }
  };

  const handleToggleGroup = async (groupId, enabled) => {
    try {
      const response = await ruleGroupsService.toggleRuleGroup(groupId, enabled);
      if (response.success) {
        setRuleGroups(prev => prev.map(group =>
          group.id === groupId ? { ...group, enabled } : group
        ));
        toast.success(`Kural grubu ${enabled ? 'etkinleştirildi' : 'devre dışı bırakıldı'}`);
      }
    } catch (error) {
      console.error('Toggle group error:', error);
      toast.error('Kural grubu durumu değiştirilemedi');
    }
  };

  const handleViewGroup = (group) => {
    setViewingGroup(group);
    setShowViewModal(true);
  };

  const validateGroup = (group) => {
    if (!group.name.trim()) {
      toast.error('Grup adı gerekli');
      return false;
    }
    if (!group.description.trim()) {
      toast.error('Grup açıklaması gerekli');
      return false;
    }
    return true;
  };

  const resetForm = () => {
    setNewGroup({
      name: '',
      description: '',
      enabled: true
    });
    setEditingGroup(null);
  };

  const handleLogout = async () => {
    try {
      console.log('⚙️ [RULE-GROUPS] Logout başladı');
      await logout();
      toast.success('Başarıyla çıkış yapıldı');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Çıkış yapılırken hata oluştu');
    }
  };

  // GÜNCELLENMİŞ HANDLE MENU CLICK FONKSİYONU (290. satır civarı)
  const handleMenuClick = (menuId) => {
    console.log('⚙️ [RULE-GROUPS] Menu tıklandı:', menuId);
    if (menuId === 'rule-groups') {
      console.log('⚙️ [RULE-GROUPS] Rule Groups seçildi, activeMenu güncelleniyor');
      setActiveMenu(menuId);
      return;
    }

    // Diğer sayfalara yönlendirmeler
    if (menuId === 'home') {
      console.log('⚙️ [RULE-GROUPS] Ana sayfaya yönlendiriliyor');
      navigate('/dashboard');
    } else if (menuId === 'updates') {
      console.log('⚙️ [RULE-GROUPS] Updates sayfasına yönlendiriliyor');
      navigate('/updates');
    } else if (menuId === 'reports') {
      console.log('⚙️ [RULE-GROUPS] Reports sayfasına yönlendiriliyor');
      navigate('/reports');
    } else if (menuId === 'settings') {
      console.log('⚙️ [RULE-GROUPS] Settings sayfasına yönlendiriliyor');
      navigate('/settings');
    } else if (menuId === 'nat-settings') {
      console.log('⚙️ [RULE-GROUPS] NAT Settings sayfasına yönlendiriliyor');
      navigate('/nat-settings');
    } else if (menuId === 'dns-management') {
      console.log('⚙️ [RULE-GROUPS] DNS Management sayfasına yönlendiriliyor');
      navigate('/dns-management');
    } else if (menuId === 'routes') {
      console.log('⚙️ [RULE-GROUPS] Routes sayfasına yönlendiriliyor');
      navigate('/routes');
    } else if (menuId === 'interface-settings') {
      console.log('⚙️ [RULE-GROUPS] Interface Settings sayfasına yönlendiriliyor');
      navigate('/interface-settings');
    } else {
      // Diğer menüler için dashboard'a git
      console.log('⚙️ [RULE-GROUPS] Dashboard\'a yönlendiriliyor');
      navigate('/dashboard');
    }
  };

  const filteredGroups = ruleGroups.filter(group =>
    group.name.toLowerCase().includes(searchGroup.toLowerCase()) ||
    group.description.toLowerCase().includes(searchGroup.toLowerCase())
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

  console.log('⚙️ [RULE-GROUPS] Component render ediliyor, state:', {
    activeMenu,
    isLoading,
    groupsCount: ruleGroups.length
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
                <h2 className="text-xl font-semibold text-white">Kural Grupları</h2>
                <span className="text-gray-400 text-sm">Güvenlik duvarı kural gruplarını oluşturun ve yönetin</span>
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
                  <span>Yeni Grup Ekle</span>
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
              title="Tanımlı Gruplar"
              value={ruleGroups.length}
              icon={<FaCog />}
              color="text-blue-400 bg-blue-500/10"
            />
            <StatCard
              title="Aktif Gruplar"
              value={ruleGroups.filter(g => g.enabled).length}
              icon={<FaCheckCircle />}
              color="text-green-400 bg-green-500/10"
            />
            <StatCard
              title="Toplam Kural Sayısı"
              value={ruleGroups.reduce((sum, group) => sum + (group.ruleCount || 0), 0)}
              icon={<FaShieldAlt />}
              color="text-purple-400 bg-purple-500/10"
            />
          </div>

          {/* Groups List */}
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <FaCog className="text-blue-400 text-xl" />
                <h3 className="text-white font-semibold text-lg">Tanımlı Gruplar</h3>
                <span className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full text-xs font-medium">
                  {filteredGroups.length} adet
                </span>
              </div>
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                  <input
                    type="text"
                    placeholder="Grup ara..."
                    value={searchGroup}
                    onChange={(e) => setSearchGroup(e.target.value)}
                    className="bg-slate-700/50 border border-slate-600 rounded-lg px-10 py-2 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Groups Table */}
            <div className="overflow-x-auto">
              {filteredGroups.length > 0 ? (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700/50">
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Grup Adı</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Açıklama</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Kural Sayısı</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Durum</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Son Güncelleme</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredGroups.map((group) => (
                      <tr key={group.id} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                        <td className="py-3 px-4">
                          <div>
                            <div className="text-white font-medium">{group.name}</div>
                            <div className="text-gray-400 text-xs">ID: {group.id}</div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-gray-300 max-w-xs truncate" title={group.description}>
                            {group.description}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="bg-slate-700/50 text-blue-300 px-2 py-1 rounded-full text-sm font-medium">
                            {group.ruleCount || 0} kural
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleToggleGroup(group.id, !group.enabled)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              group.enabled ? 'bg-green-600' : 'bg-gray-600'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                group.enabled ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </td>
                        <td className="py-3 px-4 text-gray-300 text-sm">
                          {formatDate(group.updatedAt || group.createdAt)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleViewGroup(group)}
                              className="text-green-400 hover:text-green-300 p-1 rounded transition-colors"
                              title="Görüntüle"
                            >
                              <FaEye className="text-sm" />
                            </button>
                            <button
                              onClick={() => handleEditGroup(group)}
                              className="text-blue-400 hover:text-blue-300 p-1 rounded transition-colors"
                              title="Düzenle"
                            >
                              <FaEdit className="text-sm" />
                            </button>
                            <button
                              onClick={() => handleDeleteGroup(group.id)}
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
                  <FaCog className="text-gray-500 text-4xl mb-4 mx-auto" />
                  <h4 className="text-white font-medium mb-2">
                    {searchGroup ? 'Arama kriterine uygun kural grubu bulunamadı' : 'Henüz tanımlanmış bir kural grubu bulunmamaktadır.'}
                  </h4>
                  <p className="text-gray-400 text-sm mb-6">
                    {searchGroup
                      ? 'Farklı arama terimleri deneyin'
                      : 'Yukarıdaki Yeni Grup ekle butonu ile başlayabilirsiniz.'
                    }
                  </p>
                  {!searchGroup && (
                    <button
                      onClick={() => {
                        resetForm();
                        setShowAddModal(true);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors flex items-center space-x-2 mx-auto"
                    >
                      <FaPlus className="text-sm" />
                      <span>İlk Grubu Oluştur</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Rule Groups Information */}
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6">
            <div className="flex items-center space-x-3 mb-6">
              <FaInfoCircle className="text-blue-400 text-xl" />
              <h3 className="text-white font-semibold text-lg">Kural Grupları Hakkında</h3>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-white font-medium mb-2">Kural Grupları:</h4>
                  <p className="text-gray-400 text-sm">Benzer güvenlik kurallarını organize etmek ve yönetmek için kullanılır. Her grup farklı amaçlar için özelleştirilebilir.</p>
                </div>
                <div>
                  <h4 className="text-white font-medium mb-2">Kullanım Alanları:</h4>
                  <p className="text-gray-400 text-sm">IP engelleme, port kontrolü, protokol filtreleme, coğrafi kısıtlamalar ve zaman tabanlı erişim kontrolleri için.</p>
                </div>
                <div>
                  <h4 className="text-white font-medium mb-2">Avantajları:</h4>
                  <p className="text-gray-400 text-sm">Kuralları kategorilendirir, toplu işlemler yapmanızı sağlar ve güvenlik politikalarını daha düzenli hale getirir.</p>
                </div>
                <div>
                  <h4 className="text-white font-medium mb-2">Dikkat:</h4>
                  <p className="text-gray-400 text-sm">Grup silme işlemi geri alınamaz. Grubu silmeden önce içindeki kuralları başka gruplara taşıyın veya dışa aktarın.</p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Add/Edit Group Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => {
              setShowAddModal(false);
              resetForm();
            }} />
            <span className="hidden sm:inline-block sm:h-screen sm:align-middle">&#8203;</span>
            <div className="inline-block w-full max-w-lg transform overflow-hidden rounded-lg bg-slate-800 text-left align-bottom shadow-xl transition-all sm:my-8 sm:align-middle">
              <div className="bg-slate-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-white">
                    {editingGroup ? 'Kural Grubu Düzenle' : 'Yeni Kural Grubu Oluştur'}
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
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-300 font-medium mb-2">Grup Adı</label>
                    <input
                      type="text"
                      value={newGroup.name}
                      onChange={(e) => setNewGroup(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Örn: Yasaklı IP Adresleri"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 font-medium mb-2">Açıklama</label>
                    <textarea
                      value={newGroup.description}
                      onChange={(e) => setNewGroup(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Bu grup ne amaçla kullanılacak? (Opsiyonel)"
                      rows="3"
                    />
                  </div>
                  <div className="flex items-center space-x-3">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newGroup.enabled}
                        onChange={(e) => setNewGroup(prev => ({ ...prev, enabled: e.target.checked }))}
                        className="sr-only"
                      />
                      <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        newGroup.enabled ? 'bg-green-600' : 'bg-gray-600'
                      }`}>
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            newGroup.enabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </div>
                      <span className="ml-3 text-gray-300 font-medium">Grup Etkinleştir</span>
                    </label>
                  </div>
                </div>

                {/* Kural Grubu Bilgilendirmesi */}
                <div className="mt-6 bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <FaInfoCircle className="text-blue-400 text-lg mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-blue-200 font-medium mb-1">Kural Grubu Bilgilendirmesi</p>
                      <p className="text-blue-200/80 text-sm">
                        Kural grupları benzer güvenlik kurallarını organize etmek için kullanılır. Grup oluşturduktan sonra güvenlik kuralları bölümünden bu gruba kurallar ekleyebilirsiniz.
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
                    Vazgeç
                  </button>
                  <button
                    onClick={editingGroup ? handleUpdateGroup : handleAddGroup}
                    disabled={isSaving}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    {isSaving ? (
                      <>
                        <FaSync className="animate-spin" />
                        <span>{editingGroup ? 'Güncelleniyor...' : 'Oluşturuluyor...'}</span>
                      </>
                    ) : (
                      <>
                        <FaSave />
                        <span>{editingGroup ? 'Güncelle' : 'Oluştur'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Group Modal */}
      {showViewModal && viewingGroup && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowViewModal(false)} />
            <span className="hidden sm:inline-block sm:h-screen sm:align-middle">&#8203;</span>
            <div className="inline-block w-full max-w-2xl transform overflow-hidden rounded-lg bg-slate-800 text-left align-bottom shadow-xl transition-all sm:my-8 sm:align-middle">
              <div className="bg-slate-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-white">Kural Grubu Detayları</h3>
                  <button
                    onClick={() => setShowViewModal(false)}
                    className="rounded-md bg-slate-800 text-gray-400 hover:text-gray-300 focus:outline-none"
                  >
                    <FaTimes />
                  </button>
                </div>
                <div className="space-y-6">
                  {/* Grup Bilgileri */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-gray-400 text-sm">Grup Adı</label>
                      <p className="text-white font-medium">{viewingGroup.name}</p>
                    </div>
                    <div>
                      <label className="text-gray-400 text-sm">Durum</label>
                      <p className={`font-medium ${viewingGroup.enabled ? 'text-green-400' : 'text-red-400'}`}>
                        {viewingGroup.enabled ? 'Aktif' : 'Devre Dışı'}
                      </p>
                    </div>
                    <div>
                      <label className="text-gray-400 text-sm">Kural Sayısı</label>
                      <p className="text-white font-medium">{viewingGroup.ruleCount || 0}</p>
                    </div>
                    <div>
                      <label className="text-gray-400 text-sm">Oluşturulma Tarihi</label>
                      <p className="text-white font-medium">{formatDate(viewingGroup.createdAt)}</p>
                    </div>
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm">Açıklama</label>
                    <p className="text-white">{viewingGroup.description}</p>
                  </div>

                  {/* Grup Kuralları */}
                  <div>
                    <h4 className="text-white font-medium mb-3">Grup Kuralları</h4>
                    {viewingGroup.rules && viewingGroup.rules.length > 0 ? (
                      <div className="space-y-2">
                        {viewingGroup.rules.map((rule, index) => (
                          <div key={rule.id || index} className="bg-slate-700/30 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                              <span className="text-white">{rule.source || 'N/A'}</span>
                              <div className="flex items-center space-x-2">
                                <span className="text-gray-400 text-sm">{rule.protocol}</span>
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                  rule.action === 'BLOCK' ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'
                                }`}>
                                  {rule.action}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 bg-slate-700/20 rounded-lg">
                        <FaShieldAlt className="text-gray-500 text-2xl mb-2 mx-auto" />
                        <p className="text-gray-400 text-sm">Bu grupta henüz kural bulunmuyor</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={() => setShowViewModal(false)}
                    className="bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg transition-colors"
                  >
                    Kapat
                  </button>
                  <button
                    onClick={() => {
                      setShowViewModal(false);
                      handleEditGroup(viewingGroup);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors flex items-center space-x-2"
                  >
                    <FaEdit />
                    <span>Düzenle</span>
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

export default RuleGroups;