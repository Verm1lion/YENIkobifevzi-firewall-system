import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { FaShieldAlt, FaServer, FaHome, FaChartBar, FaNetworkWired, FaRoute, FaWrench, FaFileAlt, FaSync, FaSignOutAlt, FaChevronLeft, FaChevronRight, FaGlobe, FaDatabase, FaDownload, FaRedo, FaCloudDownloadAlt, FaClock, FaExclamationTriangle, FaCheckCircle, FaBan, FaChartLine, FaEye, FaCog } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { reportsService } from '../services/reportsService';

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
      const response = await reportsService.getDataStatus();
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

const Reports = () => {
  const { user, logout } = useAuth();
  const [activeMenu, setActiveMenu] = useState('reports');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState('Son 30 gün');

  const [reportsData, setReportsData] = useState({
    totalTraffic: '2.4 TB',
    trafficGrowth: '+12',
    systemAttempts: '34',
    attemptsGrowth: '-8',
    blockedRequests: '1,247',
    blockedGrowth: '+3',
    systemUptime: '15 gün 6 saat',
    uptimePercentage: '99.8',
    securityReport: {
      attackAttempts: 34,
      blockedIPs: 12,
      topAttackedPorts: [
        { port: '22', service: 'SSH', attempts: 156 },
        { port: '80', service: 'HTTP', attempts: 89 },
        { port: '443', service: 'HTTPS', attempts: 34 }
      ]
    },
    quickStats: {
      dailyAverageTraffic: '80 GB',
      peakHour: '14:00-15:00',
      averageResponseTime: '12ms',
      successRate: '99.2%',
      securityScore: '8.7/10'
    },
    lastUpdate: '18.06.2025 04:09'
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

  const timeFilterOptions = [
    'Bugün', 'Dün', 'Son 3 gün', 'Son 1 hafta', 'Son 2 hafta',
    'Son 3 hafta', 'Son 30 gün', 'Son 60 gün'
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    fetchReportsData();

    return () => clearInterval(timer);
  }, [timeFilter]);

  const fetchReportsData = async () => {
    try {
      setIsLoading(true);
      const response = await reportsService.getReportsData(timeFilter);
      if (response.success) {
        setReportsData(response.data);
      }
      setIsLoading(false);
    } catch (error) {
      console.error('Reports data fetch error:', error);
      setIsLoading(false);
    }
  };

  const handleRefreshData = async () => {
    const loadingToast = toast.loading('Veriler yenileniyor...');
    try {
      await fetchReportsData();
      toast.dismiss(loadingToast);
      toast.success('Veriler başarıyla yenilendi');
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Veriler yenilenemedi');
    }
  };

  const handleExportReport = async (format) => {
    const loadingToast = toast.loading(`${format} raporu hazırlanıyor...`);
    try {
      await reportsService.exportReport(format, 'all', timeFilter);
      toast.dismiss(loadingToast);
      toast.success(`${format} raporu başarıyla dışa aktarıldı`);
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error(`${format} raporu dışa aktarılamadı`);
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

  // GÜNCELLENMİŞ HANDLE MENU CLICK FONKSİYONU
  const handleMenuClick = (menuId) => {
    if (menuId === 'home') {
      window.location.href = '/dashboard';
    } else if (menuId === 'updates') {
      window.location.href = '/updates';
    } else if (menuId === 'reports') {
      setActiveMenu(menuId);
    } else if (menuId === 'interface-settings') {
      window.location.href = '/interface-settings';
    } else {
      window.location.href = '/dashboard';
    }
  };

  const StatCard = ({ title, value, subtitle, icon, color = 'blue', trend, isLoading = false }) => {
    const getColorClasses = (color) => {
      const colors = {
        green: 'text-green-400 bg-green-500/10 border-green-500/20',
        blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
        yellow: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
        red: 'text-red-400 bg-red-500/10 border-red-500/20',
        orange: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
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
            {trend && (
              <div className="flex items-center mt-2">
                <span className={`text-xs font-medium ${trend.positive ? 'text-green-400' : 'text-red-400'}`}>
                  {trend.positive ? '+' : ''}{trend.value}% bu ay
                </span>
              </div>
            )}
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
                <h2 className="text-xl font-semibold text-white">Sistem Raporları</h2>
                <span className="text-gray-400 text-sm">Firewall etkinliği, güvenlik istatistikleri ve sistem performansı</span>
                <DataPersistenceIndicator />
              </div>
              <div className="flex items-center space-x-4">
                {/* Time Filter Dropdown */}
                <div className="relative">
                  <select
                    value={timeFilter}
                    onChange={(e) => setTimeFilter(e.target.value)}
                    className="bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {timeFilterOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
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
              title="Toplam Trafik"
              value={reportsData.totalTraffic}
              icon={<FaCloudDownloadAlt />}
              color="blue"
              trend={{ positive: true, value: reportsData.trafficGrowth }}
              isLoading={isLoading}
            />
            <StatCard
              title="Sistem Denemeleri"
              value={reportsData.systemAttempts}
              icon={<FaExclamationTriangle />}
              color="red"
              trend={{ positive: false, value: reportsData.attemptsGrowth }}
              isLoading={isLoading}
            />
            <StatCard
              title="Engellenen İstekler"
              value={reportsData.blockedRequests}
              icon={<FaBan />}
              color="orange"
              trend={{ positive: true, value: reportsData.blockedGrowth }}
              isLoading={isLoading}
            />
            <StatCard
              title="Sistem Çalışma Süresi"
              value={reportsData.systemUptime}
              subtitle={`%${reportsData.uptimePercentage} uptime`}
              icon={<FaCheckCircle />}
              color="green"
              isLoading={isLoading}
            />
          </div>

          {/* Report Types & Security Report */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">
            {/* Report Types */}
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="bg-blue-500/20 p-2 rounded-lg">
                  <FaFileAlt className="text-blue-400 text-xl" />
                </div>
                <h3 className="text-white font-semibold text-lg">Rapor Türleri</h3>
              </div>
              <div className="space-y-4">
                {[
                  { name: 'Güvenlik Raporu', desc: 'Güvenlik olayları ve saldırı denemeleri', icon: FaShieldAlt, color: 'text-red-400 bg-red-500/10' },
                  { name: 'Sistem Raporu', desc: 'Sistem performansı ve kaynak kullanımı', icon: FaServer, color: 'text-green-400 bg-green-500/10' },
                  { name: 'Trafik Raporu', desc: 'Ağ trafiği ve bant genişliği kullanımı', icon: FaChartLine, color: 'text-blue-400 bg-blue-500/10' },
                  { name: 'Engellemeler', desc: 'Engellenen istekler ve IP adresleri', icon: FaBan, color: 'text-orange-400 bg-orange-500/10' }
                ].map((report, index) => {
                  const Icon = report.icon;
                  return (
                    <div key={index} className="flex items-center space-x-3 p-3 bg-slate-900/30 rounded-lg hover:bg-slate-900/50 transition-colors cursor-pointer">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${report.color}`}>
                        <Icon className="text-lg" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-white font-medium">{report.name}</h4>
                        <p className="text-gray-400 text-sm">{report.desc}</p>
                      </div>
                      <FaEye className="text-gray-400 hover:text-white transition-colors" />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Security Report */}
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="bg-red-500/20 p-2 rounded-lg">
                  <FaShieldAlt className="text-red-400 text-xl" />
                </div>
                <h3 className="text-white font-semibold text-lg">Güvenlik Raporu</h3>
              </div>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-900/40 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-red-400 mb-1">{reportsData.securityReport.attackAttempts}</p>
                    <p className="text-gray-400 text-sm">Saldırı Denemeleri</p>
                  </div>
                  <div className="bg-slate-900/40 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-orange-400 mb-1">{reportsData.securityReport.blockedIPs}</p>
                    <p className="text-gray-400 text-sm">Engellenen IP'ler</p>
                  </div>
                </div>
                <div>
                  <h4 className="text-white font-medium mb-3">En Çok Saldırı Alan Portlar</h4>
                  <div className="space-y-2">
                    {reportsData.securityReport.topAttackedPorts.map((port, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-slate-900/30 rounded">
                        <div className="flex items-center space-x-2">
                          <span className="text-white font-medium">{port.port}</span>
                          <span className="text-gray-400 text-sm">({port.service})</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-16 h-1 bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-red-500 rounded-full"
                              style={{ width: `${(port.attempts / 156) * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-red-400 text-sm font-medium">{port.attempts} deneme</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Export Section */}
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="bg-green-500/20 p-2 rounded-lg">
                  <FaDownload className="text-green-400 text-xl" />
                </div>
                <h3 className="text-white font-semibold text-lg">Rapor Dışa Aktarımı</h3>
              </div>
              <div className="space-y-4">
                <p className="text-gray-400 text-sm mb-4">Rapor formatı seçin:</p>
                {[
                  { format: 'PDF', desc: 'PDF Raporu', color: 'bg-red-600 hover:bg-red-700', icon: 'PDF' },
                  { format: 'CSV', desc: 'CSV Verileri', color: 'bg-green-600 hover:bg-green-700', icon: 'CSV' },
                  { format: 'JSON', desc: 'JSON Verileri', color: 'bg-blue-600 hover:bg-blue-700', icon: 'JSON' }
                ].map((exportOption, index) => (
                  <button
                    key={index}
                    onClick={() => handleExportReport(exportOption.format)}
                    className={`w-full flex items-center justify-between p-4 ${exportOption.color} text-white rounded-lg transition-colors`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-white/20 rounded flex items-center justify-center">
                        <span className="text-xs font-bold">{exportOption.icon}</span>
                      </div>
                      <span className="font-medium">{exportOption.desc}</span>
                    </div>
                    <FaDownload className="text-sm" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Statistics & Data Update */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* Quick Statistics */}
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="bg-purple-500/20 p-2 rounded-lg">
                  <FaChartLine className="text-purple-400 text-xl" />
                </div>
                <h3 className="text-white font-semibold text-lg">Hızlı İstatistikler</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: 'Günlük Ortalama Trafik', value: reportsData.quickStats.dailyAverageTraffic, color: 'text-blue-400' },
                  { label: 'En Yoğun Saat', value: reportsData.quickStats.peakHour, color: 'text-yellow-400' },
                  { label: 'Ortalama Yanıt Süresi', value: reportsData.quickStats.averageResponseTime, color: 'text-green-400' },
                  { label: 'Başarı Oranı', value: reportsData.quickStats.successRate, color: 'text-green-400' },
                  { label: 'Güvenlik Skoru', value: reportsData.quickStats.securityScore, color: 'text-purple-400' }
                ].map((stat, index) => (
                  <div key={index} className="bg-slate-900/40 rounded-lg p-4">
                    <p className="text-gray-400 text-sm mb-1">{stat.label}</p>
                    <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Data Update */}
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="bg-yellow-500/20 p-2 rounded-lg">
                  <FaClock className="text-yellow-400 text-xl" />
                </div>
                <h3 className="text-white font-semibold text-lg">Veri Güncellemesi</h3>
              </div>
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-slate-900/40 rounded-lg">
                  <div>
                    <p className="text-white font-medium">Son Güncelleme</p>
                    <p className="text-gray-400 text-sm">{reportsData.lastUpdate}</p>
                  </div>
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                </div>
                <button
                  onClick={handleRefreshData}
                  className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg transition-colors"
                >
                  <FaRedo className="text-sm" />
                  <span>Verileri Yenile</span>
                </button>
                <div className="text-center">
                  <p className="text-gray-500 text-xs">Veriler otomatik olarak her 5 dakikada bir güncellenir</p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Reports;