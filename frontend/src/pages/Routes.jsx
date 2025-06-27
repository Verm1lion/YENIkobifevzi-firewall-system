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
  FaSearch
} from 'react-icons/fa';
import { routesService } from '../services/routesService';
import './Routes.css';

console.log('🛣️ [ROUTES] Routes component yüklendi');

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
      const response = await routesService.getDataStatus();
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

const Routes = () => {
  console.log('🛣️ [ROUTES] Routes component render başladı');
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeMenu, setActiveMenu] = useState('routes');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Routes State
  const [staticRoutes, setStaticRoutes] = useState([]);
  const [searchRoute, setSearchRoute] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRoute, setEditingRoute] = useState(null);
  const [newRoute, setNewRoute] = useState({
    destination: '',
    netmask: '',
    gateway: '',
    interface: '',
    metric: '1',
    enabled: true,
    description: ''
  });

  // Available network interfaces
  const [availableInterfaces, setAvailableInterfaces] = useState([]);

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
    console.log('🛣️ [ROUTES] useEffect başladı');
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    fetchRoutesData();
    fetchAvailableInterfaces();

    return () => {
      console.log('🛣️ [ROUTES] Component unmount, timer temizleniyor');
      clearInterval(timer);
    };
  }, []);

  const fetchRoutesData = async () => {
    try {
      console.log('🛣️ [ROUTES] Routes data fetch başladı');
      setIsLoading(true);
      const response = await routesService.getStaticRoutes();
      if (response.success) {
        console.log('🛣️ [ROUTES] Routes data başarıyla alındı:', response.data);
        setStaticRoutes(response.data || []);
      }
    } catch (error) {
      console.error('🛣️ [ROUTES] Routes data fetch error:', error);
      toast.error('Rotalar alınamadı');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailableInterfaces = async () => {
    try {
      const response = await routesService.getAvailableInterfaces();
      if (response.success) {
        setAvailableInterfaces(response.data || []);
      }
    } catch (error) {
      console.error('Interfaces fetch error:', error);
      // Set fallback interfaces
      setAvailableInterfaces([
        { name: 'eth0', displayName: 'Ethernet 0', description: 'Birincil Ethernet Arayüzü' },
        { name: 'eth1', displayName: 'Ethernet 1', description: 'İkincil Ethernet Arayüzü' },
        { name: 'wlan0', displayName: 'Wi-Fi', description: 'Kablosuz Ağ Arayüzü' },
        { name: 'ppp0', displayName: 'PPP', description: 'Point-to-Point Protokol' }
      ]);
    }
  };

  const handleAddRoute = async () => {
    if (!validateRoute(newRoute)) {
      return;
    }
    try {
      console.log('🛣️ [ROUTES] Route ekleniyor:', newRoute);
      setIsSaving(true);
      const response = await routesService.addStaticRoute(newRoute);
      if (response.success) {
        setStaticRoutes(prev => [...prev, { ...newRoute, id: Date.now().toString() }]);
        toast.success('Statik rota başarıyla eklendi');
        resetForm();
        setShowAddModal(false);
      }
    } catch (error) {
      console.error('Add route error:', error);
      toast.error('Rota eklenirken hata oluştu');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditRoute = (route) => {
    setEditingRoute(route);
    setNewRoute({
      destination: route.destination,
      netmask: route.netmask,
      gateway: route.gateway,
      interface: route.interface,
      metric: route.metric.toString(),
      enabled: route.enabled,
      description: route.description || ''
    });
    setShowAddModal(true);
  };

  const handleUpdateRoute = async () => {
    if (!validateRoute(newRoute)) {
      return;
    }
    try {
      console.log('🛣️ [ROUTES] Route güncelleniyor:', editingRoute.id, newRoute);
      setIsSaving(true);
      const response = await routesService.updateStaticRoute(editingRoute.id, newRoute);
      if (response.success) {
        setStaticRoutes(prev => prev.map(route =>
          route.id === editingRoute.id
            ? { ...route, ...newRoute, metric: parseInt(newRoute.metric) }
            : route
        ));
        toast.success('Statik rota başarıyla güncellendi');
        resetForm();
        setShowAddModal(false);
        setEditingRoute(null);
      }
    } catch (error) {
      console.error('Update route error:', error);
      toast.error('Rota güncellenirken hata oluştu');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRoute = async (routeId) => {
    if (!window.confirm('Bu rotayı silmek istediğinizden emin misiniz?')) {
      return;
    }
    try {
      console.log('🛣️ [ROUTES] Route siliniyor:', routeId);
      const response = await routesService.deleteStaticRoute(routeId);
      if (response.success) {
        setStaticRoutes(prev => prev.filter(route => route.id !== routeId));
        toast.success('Statik rota başarıyla silindi');
      }
    } catch (error) {
      console.error('Delete route error:', error);
      toast.error('Rota silinirken hata oluştu');
    }
  };

  const handleToggleRoute = async (routeId, enabled) => {
    try {
      const response = await routesService.toggleStaticRoute(routeId, enabled);
      if (response.success) {
        setStaticRoutes(prev => prev.map(route =>
          route.id === routeId ? { ...route, enabled } : route
        ));
        toast.success(`Rota ${enabled ? 'etkinleştirildi' : 'devre dışı bırakıldı'}`);
      }
    } catch (error) {
      console.error('Toggle route error:', error);
      toast.error('Rota durumu değiştirilemedi');
    }
  };

  const validateRoute = (route) => {
    if (!route.destination.trim()) {
      toast.error('Hedef ağ adresi gerekli');
      return false;
    }
    if (!route.netmask.trim()) {
      toast.error('Alt ağ maskesi gerekli');
      return false;
    }
    if (!route.gateway.trim()) {
      toast.error('Ağ geçidi gerekli');
      return false;
    }
    if (!route.interface.trim()) {
      toast.error('Ağ arayüzü seçilmeli');
      return false;
    }

    // IP format validation
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (!ipRegex.test(route.destination)) {
      toast.error('Geçersiz hedef ağ adresi formatı');
      return false;
    }
    if (!ipRegex.test(route.netmask)) {
      toast.error('Geçersiz alt ağ maskesi formatı');
      return false;
    }
    if (!ipRegex.test(route.gateway)) {
      toast.error('Geçersiz ağ geçidi formatı');
      return false;
    }

    return true;
  };

  const resetForm = () => {
    setNewRoute({
      destination: '',
      netmask: '',
      gateway: '',
      interface: '',
      metric: '1',
      enabled: true,
      description: ''
    });
    setEditingRoute(null);
  };

  const handleLogout = async () => {
    try {
      console.log('🛣️ [ROUTES] Logout başladı');
      await logout();
      toast.success('Başarıyla çıkış yapıldı');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Çıkış yapılırken hata oluştu');
    }
  };

  // GÜNCELLENMİŞ HANDLE MENU CLICK FONKSİYONU (340. satır civarı)
  const handleMenuClick = (menuId) => {
    console.log('🛣️ [ROUTES] Menu tıklandı:', menuId);
    if (menuId === 'routes') {
      console.log('🛣️ [ROUTES] Routes seçildi, activeMenu güncelleniyor');
      setActiveMenu(menuId);
      return;
    }

    // Diğer sayfalara yönlendirmeler
    if (menuId === 'home') {
      console.log('🛣️ [ROUTES] Ana sayfaya yönlendiriliyor');
      navigate('/dashboard');
    } else if (menuId === 'updates') {
      console.log('🛣️ [ROUTES] Updates sayfasına yönlendiriliyor');
      navigate('/updates');
    } else if (menuId === 'reports') {
      console.log('🛣️ [ROUTES] Reports sayfasına yönlendiriliyor');
      navigate('/reports');
    } else if (menuId === 'settings') {
      console.log('🛣️ [ROUTES] Settings sayfasına yönlendiriliyor');
      navigate('/settings');
    } else if (menuId === 'nat-settings') {
      console.log('🛣️ [ROUTES] NAT Settings sayfasına yönlendiriliyor');
      navigate('/nat-settings');
    } else if (menuId === 'dns-management') {
      console.log('🛣️ [ROUTES] DNS Management sayfasına yönlendiriliyor');
      navigate('/dns-management');
    } else if (menuId === 'interface-settings') {
      console.log('🛣️ [ROUTES] Interface Settings sayfasına yönlendiriliyor');
      navigate('/interface-settings');
    } else {
      // Diğer menüler için dashboard'a git
      console.log('🛣️ [ROUTES] Dashboard\'a yönlendiriliyor');
      navigate('/dashboard');
    }
  };

  const filteredRoutes = staticRoutes.filter(route =>
    route.destination.toLowerCase().includes(searchRoute.toLowerCase()) ||
    route.gateway.toLowerCase().includes(searchRoute.toLowerCase()) ||
    route.interface.toLowerCase().includes(searchRoute.toLowerCase())
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

  console.log('🛣️ [ROUTES] Component render ediliyor, state:', {
    activeMenu,
    isLoading,
    routesCount: staticRoutes.length
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
                <h2 className="text-xl font-semibold text-white">Statik Rotalar</h2>
                <span className="text-gray-400 text-sm">Ağ yönlendirme tablosu yönetimi ve statik rota yapılandırması</span>
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
                  <span>Yeni Rota</span>
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
              title="Mevcut Statik Rotalar"
              value={staticRoutes.length}
              icon={<FaRoute />}
              color="text-blue-400 bg-blue-500/10"
            />
            <StatCard
              title="Aktif Rotalar"
              value={staticRoutes.filter(r => r.enabled).length}
              icon={<FaCheckCircle />}
              color="text-green-400 bg-green-500/10"
            />
            <StatCard
              title="Kullanılabilir Arayüzler"
              value={availableInterfaces.length}
              icon={<FaNetworkWired />}
              color="text-purple-400 bg-purple-500/10"
            />
          </div>

          {/* Routes List */}
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <FaRoute className="text-blue-400 text-xl" />
                <h3 className="text-white font-semibold text-lg">Mevcut Statik Rotalar</h3>
                <span className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full text-xs font-medium">
                  {filteredRoutes.length} adet
                </span>
              </div>
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                  <input
                    type="text"
                    placeholder="Rota ara..."
                    value={searchRoute}
                    onChange={(e) => setSearchRoute(e.target.value)}
                    className="bg-slate-700/50 border border-slate-600 rounded-lg px-10 py-2 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Routes Table */}
            <div className="overflow-x-auto">
              {filteredRoutes.length > 0 ? (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700/50">
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Hedef Ağ</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Alt Ağ Maskesi</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Ağ Geçidi</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Arayüz</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Metrik</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Durum</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRoutes.map((route) => (
                      <tr key={route.id} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                        <td className="py-3 px-4 text-white font-medium">{route.destination}</td>
                        <td className="py-3 px-4 text-gray-300">{route.netmask}</td>
                        <td className="py-3 px-4 text-gray-300">{route.gateway}</td>
                        <td className="py-3 px-4 text-gray-300">{route.interface}</td>
                        <td className="py-3 px-4 text-gray-300">{route.metric}</td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleToggleRoute(route.id, !route.enabled)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              route.enabled ? 'bg-green-600' : 'bg-gray-600'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                route.enabled ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleEditRoute(route)}
                              className="text-blue-400 hover:text-blue-300 p-1 rounded transition-colors"
                              title="Düzenle"
                            >
                              <FaEdit className="text-sm" />
                            </button>
                            <button
                              onClick={() => handleDeleteRoute(route.id)}
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
                  <FaRoute className="text-gray-500 text-4xl mb-4 mx-auto" />
                  <h4 className="text-white font-medium mb-2">
                    {searchRoute ? 'Arama kriterine uygun rota bulunamadı' : 'Henüz statik rota yok'}
                  </h4>
                  <p className="text-gray-400 text-sm mb-6">
                    {searchRoute
                      ? 'Farklı arama terimleri deneyin'
                      : 'İlk rotayı oluşturmak için yukarıdaki butonu kullanın'
                    }
                  </p>
                  {!searchRoute && (
                    <button
                      onClick={() => {
                        resetForm();
                        setShowAddModal(true);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors flex items-center space-x-2 mx-auto"
                    >
                      <FaPlus className="text-sm" />
                      <span>İlk Rotayı Oluştur</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Static Routes Information */}
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6">
            <div className="flex items-center space-x-3 mb-6">
              <FaInfoCircle className="text-blue-400 text-xl" />
              <h3 className="text-white font-semibold text-lg">Statik Rotalar Hakkında</h3>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-white font-medium mb-2">Statik Rotalar:</h4>
                  <p className="text-gray-400 text-sm">Belirli ağ trafiğini hangi ağ geçidi üzerinden yönlendirileceğini manuel olarak belirler. Bu yaklaşım ağ adresleme seviyesinde çalışır.</p>
                </div>
                <div>
                  <h4 className="text-white font-medium mb-2">Kullanım Alanları:</h4>
                  <p className="text-gray-400 text-sm">Farklı ağ segmentlerine erişim, VPN trafiği yönlendirme, belirli servislere özel yollar tanımlama için kullanılır.</p>
                </div>
                <div>
                  <h4 className="text-white font-medium mb-2">Metrik:</h4>
                  <p className="text-gray-400 text-sm">Aynı hedefe birden fazla rota varsa, düşük metrik değerine sahip rota tercih edilir. Varsayılan olarak 1 değerini alır.</p>
                </div>
                <div>
                  <h4 className="text-white font-medium mb-2">Dikkat:</h4>
                  <p className="text-gray-400 text-sm">Yanlış yapılandırılmış statik rotalar ağ bağlantısını kesebilir. Değişiklik yapmadan önce mevcut ağ yapılandırmanızı analiz edin.</p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Add/Edit Route Modal */}
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
                    {editingRoute ? 'Statik Rota Düzenle' : 'Yeni Statik Rota Ekle'}
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
                    <label className="block text-gray-300 font-medium mb-2">Hedef Ağ Adresi</label>
                    <input
                      type="text"
                      value={newRoute.destination}
                      onChange={(e) => setNewRoute(prev => ({ ...prev, destination: e.target.value }))}
                      className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="192.168.50.0"
                    />
                    <p className="text-gray-500 text-xs mt-1">Ulaşılacak hedef ağ adresi</p>
                  </div>
                  <div>
                    <label className="block text-gray-300 font-medium mb-2">Alt Ağ Maskesi</label>
                    <input
                      type="text"
                      value={newRoute.netmask}
                      onChange={(e) => setNewRoute(prev => ({ ...prev, netmask: e.target.value }))}
                      className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="255.255.255.0"
                    />
                    <p className="text-gray-500 text-xs mt-1">Hedef ağın alt ağ maskesi</p>
                  </div>
                  <div>
                    <label className="block text-gray-300 font-medium mb-2">Ağ Geçidi</label>
                    <input
                      type="text"
                      value={newRoute.gateway}
                      onChange={(e) => setNewRoute(prev => ({ ...prev, gateway: e.target.value }))}
                      className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="192.168.1.1"
                    />
                    <p className="text-gray-500 text-xs mt-1">Trafiğin yönlendirileceği ağ geçidi</p>
                  </div>
                  <div>
                    <label className="block text-gray-300 font-medium mb-2">Ağ Arayüzü</label>
                    <select
                      value={newRoute.interface}
                      onChange={(e) => setNewRoute(prev => ({ ...prev, interface: e.target.value }))}
                      className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Arayüz seçiniz</option>
                      {availableInterfaces.map((iface) => (
                        <option key={iface.name} value={iface.name}>
                          {iface.displayName} - {iface.description}
                        </option>
                      ))}
                    </select>
                    <p className="text-gray-500 text-xs mt-1">Trafiğin çıkacağı fiziksel arayüz</p>
                  </div>
                  <div>
                    <label className="block text-gray-300 font-medium mb-2">Metrik (Öncelik)</label>
                    <input
                      type="number"
                      min="1"
                      max="255"
                      value={newRoute.metric}
                      onChange={(e) => setNewRoute(prev => ({ ...prev, metric: e.target.value }))}
                      className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="1"
                    />
                    <p className="text-gray-500 text-xs mt-1">Düşük değer yüksek öncelik. Varsayılan: 1</p>
                  </div>
                  <div>
                    <label className="block text-gray-300 font-medium mb-2">Açıklama (İsteğe bağlı)</label>
                    <input
                      type="text"
                      value={newRoute.description}
                      onChange={(e) => setNewRoute(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Rota açıklaması..."
                    />
                  </div>
                  <div className="flex items-center space-x-3">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newRoute.enabled}
                        onChange={(e) => setNewRoute(prev => ({ ...prev, enabled: e.target.checked }))}
                        className="sr-only"
                      />
                      <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        newRoute.enabled ? 'bg-green-600' : 'bg-gray-600'
                      }`}>
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            newRoute.enabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </div>
                      <span className="ml-3 text-gray-300 font-medium">Rota Etkinleştir</span>
                    </label>
                  </div>
                </div>

                {/* Statik Rota Bilgilendirmesi */}
                <div className="mt-6 bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <FaInfoCircle className="text-blue-400 text-lg mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-blue-200 font-medium mb-1">Statik Rota Bilgilendirmesi</p>
                      <p className="text-blue-200/80 text-sm">
                        Statik rotalar sistem yeniden başlatıldığında kalıcıdır. Metrik değeri ne kadar düşükse o rota o kadar yüksek önceliğe sahiptir. Aynı hedef için birden fazla rota tanımlanabilir.
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
                    onClick={editingRoute ? handleUpdateRoute : handleAddRoute}
                    disabled={isSaving}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    {isSaving ? (
                      <>
                        <FaSync className="animate-spin" />
                        <span>{editingRoute ? 'Güncelleniyor...' : 'Ekleniyor...'}</span>
                      </>
                    ) : (
                      <>
                        <FaSave />
                        <span>Rota {editingRoute ? 'Güncelle' : 'Ekle'}</span>
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

export default Routes;