// src/pages/Updates.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { FaSync, FaCheckCircle, FaClock, FaExclamationTriangle, FaCogs, FaCloudDownloadAlt, FaInfoCircle, FaHistory, FaExclamationCircle, FaDownload, FaCheck, FaTimes, FaShieldAlt, FaServer, FaHome, FaChartBar, FaNetworkWired, FaRoute, FaWrench, FaFileAlt, FaSignOutAlt, FaChevronLeft, FaChevronRight, FaGlobe, FaDatabase, FaPlay, FaBan } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { updatesService } from '../services/updatesService';

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
      const response = await updatesService.getDataStatus();
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

  const isPersistent = dataStatus.persistence?.enabled && dataStatus.persistence?.dataCollection;

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
          ({dataStatus.persistence?.totalActivities?.toLocaleString() || 0} kayıt)
        </span>
      </div>
      <div className="text-xs text-gray-500">
        Çalışma: {formatUptime(dataStatus.persistence?.systemUptime || 0)}
      </div>
    </div>
  );
};

const Updates = () => {
  const { user, logout } = useAuth();
  const [activeMenu, setActiveMenu] = useState('updates');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [updateData, setUpdateData] = useState(null);

  const menuItems = [
    { id: 'home', label: 'Ana Sayfa', icon: FaHome },
    { id: 'logs', label: 'Loglar', icon: FaChartBar },
    { id: 'security-rules', label: 'Güvenlik Kuralları', icon: FaShieldAlt },
    { id: 'rule-groups', label: 'Kural Grupları', icon: FaCogs },
    { id: 'interface-settings', label: 'İnterface Ayarları', icon: FaNetworkWired },
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

    fetchUpdateData();

    return () => clearInterval(timer);
  }, []);

  const fetchUpdateData = async () => {
    try {
      setIsLoading(true);
      const response = await updatesService.getUpdatesData();
      if (response.success) {
        setUpdateData(response.data);
      }
    } catch (error) {
      console.error('Update data fetch error:', error);
      toast.error('Güncelleme verileri alınamadı');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckUpdates = async () => {
    const loadingToast = toast.loading('Güncellemeler kontrol ediliyor...');
    try {
      const response = await updatesService.checkUpdates();
      if (response.success) {
        toast.dismiss(loadingToast);
        toast.success('Güncelleme kontrolü tamamlandı');
        await fetchUpdateData();
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Güncelleme kontrolü başarısız');
    }
  };

  const handleInstallUpdate = async (updateId) => {
    const loadingToast = toast.loading('Güncelleme yükleniyor...');
    try {
      const response = await updatesService.installUpdate(updateId);
      if (response.success) {
        toast.dismiss(loadingToast);
        toast.success('Güncelleme başarıyla yüklendi');
        await fetchUpdateData();
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Güncelleme yüklemesi başarısız');
    }
  };

  const handleToggleAutoUpdate = async () => {
    try {
      const newAutoUpdate = !updateData.updateSettings.autoUpdate;
      const response = await updatesService.updateSettings({
        autoUpdate: newAutoUpdate
      });
      if (response.success) {
        setUpdateData(prev => ({
          ...prev,
          updateSettings: {
            ...prev.updateSettings,
            autoUpdate: newAutoUpdate
          }
        }));
        toast.success(`Otomatik güncelleme ${newAutoUpdate ? 'açıldı' : 'kapatıldı'}`);
      }
    } catch (error) {
      toast.error('Ayar değiştirilemedi');
    }
  };

  const handleUpdateSettings = async (settingKey, value) => {
    try {
      const response = await updatesService.updateSettings({
        [settingKey]: value
      });
      if (response.success) {
        setUpdateData(prev => ({
          ...prev,
          updateSettings: {
            ...prev.updateSettings,
            [settingKey]: value
          }
        }));
        toast.success('Ayar güncellendi');
      }
    } catch (error) {
      toast.error('Ayar güncellenemedi');
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

  // GÜNCELLENMİŞ HANDLE MENU CLICK FONKSİYONU (100. satır civarı)
  const handleMenuClick = (menuId) => {
    if (menuId === 'home') {
      window.location.href = '/dashboard';
    } else if (menuId === 'updates') {
      setActiveMenu(menuId);
    } else if (menuId === 'interface-settings') {
      window.location.href = '/interface-settings';
    } else {
      window.location.href = '/dashboard';
    }
  };

  const StatCard = ({ title, value, subtitle, icon, color = 'blue', isLoading = false }) => {
    const getColorClasses = (color) => {
      const colors = {
        green: 'text-green-400 bg-green-500/10 border-green-500/20',
        blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
        yellow: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
        red: 'text-red-400 bg-red-500/10 border-red-500/20',
        gray: 'text-gray-400 bg-gray-500/10 border-gray-500/20'
      };
      return colors[color] || colors.blue;
    };

    if (isLoading) {
      return (
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-4">
          <div className="animate-pulse">
            <div className="h-4 bg-slate-700 rounded mb-2"></div>
            <div className="h-8 bg-slate-700 rounded mb-2"></div>
            <div className="h-3 bg-slate-700 rounded"></div>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-4 hover:bg-slate-800/70 transition-all duration-200">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-gray-400 text-sm font-medium mb-1">{title}</p>
            <p className="font-bold text-2xl text-white mb-1">{value}</p>
            {subtitle && <p className="text-gray-500 text-xs">{subtitle}</p>}
          </div>
          {icon && (
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getColorClasses(color)}`}>
              {icon}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!updateData && !isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <FaExclamationTriangle className="text-red-400 text-4xl mb-4 mx-auto" />
          <h2 className="text-white text-xl font-semibold mb-2">Veri Yüklenemedi</h2>
          <p className="text-gray-400 mb-4">Güncelleme verileri alınamadı</p>
          <button
            onClick={fetchUpdateData}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

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
                <h2 className="text-xl font-semibold text-white">Sistem Güncellemeleri</h2>
                <span className="text-gray-400 text-sm">Firewall ve sistem güncellemelerini yönetin</span>
                <DataPersistenceIndicator />
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleCheckUpdates}
                  className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <FaSync className="text-sm" />
                  <span>Güncelleme Kontrol Et</span>
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
          {/* Top Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Mevcut Sürüm"
              value={updateData?.currentVersion || '2.1.0'}
              subtitle="Güncel"
              icon={<FaCheckCircle />}
              color="green"
              isLoading={isLoading}
            />
            <StatCard
              title="Son Kontrol"
              value={updateData?.lastCheck?.split(' ')[1] || '--:--'}
              subtitle={`${updateData?.lastCheck?.split(' ')[0] || 'Tarih'} - ${updateData?.checkMethod || 'Otomatik'}`}
              icon={<FaClock />}
              color="blue"
              isLoading={isLoading}
            />
            <StatCard
              title="Bekleyen Güncellemeler"
              value={updateData?.pendingUpdates || 0}
              subtitle={updateData?.updateStatus || 'Güncel'}
              icon={<FaExclamationTriangle />}
              color={updateData?.pendingUpdates > 0 ? "yellow" : "green"}
              isLoading={isLoading}
            />
            <StatCard
              title="Otomatik Güncelleme"
              value={updateData?.updateSettings?.autoUpdate ? "Açık" : "Kapalı"}
              subtitle="Etkin"
              icon={<FaCogs />}
              color={updateData?.updateSettings?.autoUpdate ? "green" : "gray"}
              isLoading={isLoading}
            />
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">
            {/* Available Updates - Left Side */}
            <div className="xl:col-span-2">
              <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="bg-yellow-500/20 p-2 rounded-lg">
                      <FaExclamationTriangle className="text-yellow-400 text-xl" />
                    </div>
                    <h3 className="text-white font-semibold text-lg">Mevcut Güncellemeler</h3>
                    <span className="bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded-full text-xs font-medium">
                      {updateData?.pendingUpdates || 0} adet
                    </span>
                  </div>
                </div>
                <div className="space-y-4">
                  {updateData?.availableUpdates && updateData.availableUpdates.length > 0 ? (
                    updateData.availableUpdates.map((update) => (
                      <div key={update.id || update._id} className="bg-slate-900/40 rounded-xl p-5 border border-slate-700/30">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h4 className="text-white font-semibold text-lg">{update.name}</h4>
                              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                update.priority === 'Yüksek Öncelikli'
                                  ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                                  : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              }`}>
                                {update.priority}
                              </span>
                            </div>
                            <p className="text-gray-300 font-medium mb-3">{update.update_type}</p>
                            <div className="flex items-center space-x-6 text-sm text-gray-400">
                              <div className="flex items-center space-x-1">
                                <FaClock className="text-xs" />
                                <span>{update.date}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <FaDownload className="text-xs" />
                                <span>{update.size}</span>
                              </div>
                              <span>{update.location}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleInstallUpdate(update.id || update._id)}
                            disabled={update.status === 'Yükleniyor' || update.status === 'Yüklendi'}
                            className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center space-x-2 ${
                              update.status === 'Yüklendi'
                                ? 'bg-green-600/20 text-green-300 border border-green-500/30 cursor-default'
                                : update.status === 'Yükleniyor'
                                ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-blue-500/25'
                            }`}
                          >
                            {update.status === 'Yüklendi' ? (
                              <>
                                <FaCheck className="text-sm" />
                                <span>Yüklendi</span>
                              </>
                            ) : update.status === 'Yükleniyor' ? (
                              <>
                                <FaSync className="text-sm animate-spin" />
                                <span>Yükleniyor...</span>
                              </>
                            ) : (
                              <>
                                <FaDownload className="text-sm" />
                                <span>Yükle</span>
                              </>
                            )}
                          </button>
                        </div>
                        <div className="border-t border-slate-700/50 pt-4">
                          <h5 className="text-gray-300 font-semibold mb-3 flex items-center space-x-2">
                            <span>Yapılan Değişiklikler:</span>
                          </h5>
                          <div className="space-y-2">
                            {update.changes.map((change, index) => (
                              <div key={index} className="flex items-start space-x-3">
                                <div className="w-1.5 h-1.5 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                                <span className="text-gray-400 text-sm leading-relaxed">{change}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <FaCheckCircle className="text-green-400 text-3xl mb-3 mx-auto" />
                      <h4 className="text-white font-medium mb-2">Sistem Güncel</h4>
                      <p className="text-gray-400 text-sm">Şu anda yüklenmeyi bekleyen güncelleme bulunmuyor.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Side - Settings and Info */}
            <div className="space-y-6">
              {/* Update Settings */}
              <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="bg-blue-500/20 p-2 rounded-lg">
                    <FaCogs className="text-blue-400 text-xl" />
                  </div>
                  <h3 className="text-white font-semibold text-lg">Güncelleme Ayarları</h3>
                </div>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300 font-medium">Otomatik Güncelleme</span>
                    <button
                      onClick={handleToggleAutoUpdate}
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 ${
                        updateData?.updateSettings?.autoUpdate ? 'bg-green-600' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-200 ${
                          updateData?.updateSettings?.autoUpdate ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  <div>
                    <label className="text-gray-300 font-medium mb-3 block">Kontrol Sıklığı</label>
                    <select
                      value={updateData?.updateSettings?.checkFrequency || 'daily'}
                      onChange={(e) => handleUpdateSettings('checkFrequency', e.target.value)}
                      className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="daily">Günlük</option>
                      <option value="weekly">Haftalık</option>
                      <option value="monthly">Aylık</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-gray-300 font-medium mb-3 block">Otomatik Yükleme Saati</label>
                    <select
                      value={updateData?.updateSettings?.autoInstallTime || '02:00'}
                      onChange={(e) => handleUpdateSettings('autoInstallTime', e.target.value)}
                      className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={`${i.toString().padStart(2, '0')}:00`}>
                          {`${i.toString().padStart(2, '0')}:00`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* System Info */}
              <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="bg-green-500/20 p-2 rounded-lg">
                    <FaInfoCircle className="text-green-400 text-xl" />
                  </div>
                  <h3 className="text-white font-semibold text-lg">Sistem Bilgileri</h3>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Ürün</span>
                    <span className="text-white font-medium">{updateData?.systemInfo?.product || 'NetGate Firewall'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Mevcut Sürüm</span>
                    <span className="text-white font-medium">{updateData?.systemInfo?.currentVersion || '2.1.0'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Son Sürüm</span>
                    <span className="text-green-400 font-medium">{updateData?.systemInfo?.latestVersion || '2.1.2'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Derleme Tarihi</span>
                    <span className="text-white font-medium">{updateData?.systemInfo?.buildDate || '2025.06.19'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Lisans</span>
                    <span className="text-blue-400 font-medium">{updateData?.systemInfo?.license || 'Pro'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Section - History and Important Notes */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* Update History */}
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="bg-purple-500/20 p-2 rounded-lg">
                  <FaHistory className="text-purple-400 text-xl" />
                </div>
                <h3 className="text-white font-semibold text-lg">Güncelleme Geçmişi</h3>
              </div>
              <div className="space-y-3">
                {updateData?.updateHistory && updateData.updateHistory.length > 0 ? (
                  updateData.updateHistory.map((update, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-slate-900/30 rounded-lg hover:bg-slate-900/50 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${
                          update.status === 'Başarılı' ? 'bg-green-400' : 'bg-red-400'
                        }`}></div>
                        <div>
                          <span className="text-white font-semibold">{update.version}</span>
                          <p className="text-gray-400 text-sm">{update.update_type}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-gray-300 font-medium">
                          {update.date || new Date(update.install_date).toLocaleDateString('tr-TR')}
                        </span>
                        <p className={`text-sm font-medium ${
                          update.status === 'Başarılı' ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {update.status}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6">
                    <FaHistory className="text-gray-500 text-2xl mb-2 mx-auto" />
                    <p className="text-gray-400 text-sm">Henüz güncelleme geçmişi yok</p>
                  </div>
                )}
              </div>
            </div>

            {/* Important Notes */}
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="bg-yellow-500/20 p-2 rounded-lg">
                  <FaExclamationCircle className="text-yellow-400 text-xl" />
                </div>
                <h3 className="text-white font-semibold text-lg">Önemli Notlar</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-start space-x-3 p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                  <FaExclamationTriangle className="text-yellow-400 text-lg mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-yellow-200 font-medium mb-1">Sistem Yeniden Başlatması</p>
                    <p className="text-yellow-200/80 text-sm">Güncellemeler sistem yeniden başlatması gerektirebilir</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                  <FaShieldAlt className="text-blue-400 text-lg mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-blue-200 font-medium mb-1">Otomatik Yedekleme</p>
                    <p className="text-blue-200/80 text-sm">Güncelleme öncesi otomatik yedekleme yapılır</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                  <FaBan className="text-red-400 text-lg mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-red-200 font-medium mb-1">Kritik Güncellemeler</p>
                    <p className="text-red-200/80 text-sm">Kritik güncellemeler hemen yüklenir</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Updates;