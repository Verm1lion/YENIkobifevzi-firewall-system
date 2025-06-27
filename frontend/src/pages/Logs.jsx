import React, { useState, useEffect, useCallback } from 'react';
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
  FaSearch,
  FaDownload,
  FaTrash,
  FaEye,
  FaFilter,
  FaTimes,
  FaCalendarAlt,
  FaInfoCircle,
  FaBan,
  FaPlay,
  FaExclamationCircle,
  FaChevronUp,
  FaChevronDown,
  FaStop,
  FaWifi,
  FaDesktop,
  FaGlobe as FaInternet,
  FaPlug
} from 'react-icons/fa';
import { logsService } from '../services/logsService';
import { webSocketService } from '../services/websocketService';
import DataPersistenceIndicator from '../components/DataPersistenceIndicator';
import RealTimeIndicator from '../components/RealTimeIndicator';
import './Logs.css';

console.log('📊 [LOGS] Enhanced Logs component yüklendi');

const Logs = () => {
  console.log('📊 [LOGS] Enhanced Logs component render başladı');
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // ===========================================
  // UI STATE
  // ===========================================
  const [activeMenu, setActiveMenu] = useState('logs');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // ===========================================
  // LOGS STATE
  // ===========================================
  const [logs, setLogs] = useState([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);

  // ===========================================
  // FILTER STATE
  // ===========================================
  const [filters, setFilters] = useState({
    keyword: '',
    level: 'Tümü',
    startDate: '',
    endDate: '',
    sourceIp: '',
    deviceIp: ''
  });

  // ===========================================
  // UI STATE
  // ===========================================
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLogs, setSelectedLogs] = useState([]);
  const [showLogDetail, setShowLogDetail] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [sortBy, setSortBy] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState('desc');

  // ===========================================
  // TRAFFIC MONITORING STATE
  // ===========================================
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [monitoringStatus, setMonitoringStatus] = useState(null);
  const [icsInfo, setIcsInfo] = useState(null);

  // ===========================================
  // REAL-TIME STATE
  // ===========================================
  const [realTimeConnection, setRealTimeConnection] = useState(false);
  const [realtimeLogs, setRealtimeLogs] = useState([]);
  const [newLogsCount, setNewLogsCount] = useState(0);

  // ===========================================
  // DASHBOARD STATS STATE
  // ===========================================
  const [dashboardStats, setDashboardStats] = useState({
    total_logs: 0,
    blocked_requests: 0,
    allowed_requests: 0,
    system_warnings: 0,
    connected_devices: 0,
    threats_detected: 0,
    last_updated: null
  });

  // ===========================================
  // DEVICE MANAGEMENT STATE
  // ===========================================
  const [connectedDevices, setConnectedDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);

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

  const logLevels = [
    'Tümü',
    'ALLOW',
    'BLOCK',
    'DENY',
    'DROP',
    'REJECT',
    'INFO',
    'WARNING',
    'ERROR',
    'CRITICAL',
    'DEBUG'
  ];

  // ===========================================
  // EFFECTS
  // ===========================================
  useEffect(() => {
    console.log('📊 [LOGS] Main useEffect başladı');
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Initialize all services
    initializeServices();

    // Auto refresh interval
    const refreshInterval = setInterval(() => {
      if (!isLoading) {
        fetchDashboardStats();
        fetchMonitoringStatus();
      }
    }, 30000);

    return () => {
      console.log('📊 [LOGS] Component unmount, cleanup yapılıyor');
      clearInterval(timer);
      clearInterval(refreshInterval);
      webSocketService.disconnect();
    };
  }, []);

  // Fetch logs when filters or pagination changes
  useEffect(() => {
    fetchLogs();
  }, [currentPage, filters, sortBy, sortOrder]);

  // ===========================================
  // INITIALIZATION
  // ===========================================
  const initializeServices = async () => {
    try {
      console.log('📊 [LOGS] Services initialize ediliyor');
      // Fetch initial data
      await Promise.all([
        fetchDashboardStats(),
        fetchMonitoringStatus(),
        fetchConnectedDevices(),
        detectICS()
      ]);

      // Setup WebSocket
      setupWebSocket();
    } catch (error) {
      console.error('📊 [LOGS] Services initialization error:', error);
    }
  };

  const setupWebSocket = () => {
    try {
      console.log('📊 [LOGS] WebSocket setup başlıyor');

      // WebSocket event listeners
      webSocketService.onNewLog((logData) => {
        console.log('📊 [LOGS] Yeni log alındı:', logData);
        // Add to realtime buffer
        setRealtimeLogs(prev => [logData, ...prev.slice(0, 99)]);
        setNewLogsCount(prev => prev + 1);

        // If on first page, add to main logs
        if (currentPage === 1) {
          setLogs(prev => [logData, ...prev.slice(0, pageSize - 1)]);
          setTotalLogs(prev => prev + 1);
        }
      });

      webSocketService.onStatsUpdate((statsData) => {
        console.log('📊 [LOGS] Stats update alındı:', statsData);
        setDashboardStats(statsData);
      });

      webSocketService.onConnectionChange((connected, quality) => {
        console.log('📊 [LOGS] WebSocket connection change:', connected, quality);
        setRealTimeConnection(connected);
      });

      webSocketService.onError((error) => {
        console.error('📊 [LOGS] WebSocket error:', error);
        toast.error(`Real-time bağlantı hatası: ${error}`);
      });

      webSocketService.onReconnect((attempts) => {
        console.log('📊 [LOGS] WebSocket reconnect attempt:', attempts);
        toast.info(`Real-time bağlantı yeniden kuruluyor... (${attempts}/10)`);
      });

      webSocketService.onMonitoringStatusChange((statusData) => {
        console.log('📊 [LOGS] Monitoring status change:', statusData);
        setMonitoringStatus(statusData);
        setIsMonitoring(statusData.is_monitoring || false);
      });

      // Connect
      webSocketService.connect();
    } catch (error) {
      console.error('📊 [LOGS] WebSocket setup error:', error);
    }
  };

  // ===========================================
  // DATA FETCHING
  // ===========================================
  const fetchLogs = useCallback(async () => {
    try {
      console.log('📊 [LOGS] Logs data fetch başladı');
      setIsLoading(true);

      const params = {
        page: currentPage,
        limit: pageSize,
        keyword: filters.keyword || undefined,
        level: filters.level !== 'Tümü' ? filters.level : undefined,
        device_ip: filters.deviceIp || undefined,
        start_date: filters.startDate || undefined,
        end_date: filters.endDate || undefined
      };

      const response = await logsService.getLogs(params);

      if (response.success) {
        console.log('📊 [LOGS] Logs data başarıyla alındı:', response.data);
        setLogs(response.data.logs || []);
        setTotalLogs(response.data.pagination?.total_count || 0);

        // Reset new logs count when data is refreshed
        if (currentPage === 1) {
          setNewLogsCount(0);
        }
      } else {
        console.error('📊 [LOGS] Logs fetch failed:', response.error);
        toast.error(response.error);
      }
    } catch (error) {
      console.error('📊 [LOGS] Logs data fetch error:', error);
      toast.error('Log verileri alınamadı');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, filters]);

  const fetchDashboardStats = useCallback(async () => {
    try {
      const response = await logsService.getDashboardStats();
      if (response.success) {
        setDashboardStats(response.data);
      }
    } catch (error) {
      console.error('📊 [LOGS] Dashboard stats fetch error:', error);
    }
  }, []);

  const fetchMonitoringStatus = useCallback(async () => {
    try {
      const response = await logsService.getTrafficMonitoringStatus();
      if (response.success) {
        setMonitoringStatus(response.data);
        setIsMonitoring(response.data.is_monitoring || false);
      }
    } catch (error) {
      console.error('📊 [LOGS] Monitoring status fetch error:', error);
    }
  }, []);

  const fetchConnectedDevices = useCallback(async () => {
    try {
      const response = await logsService.getConnectedDevices();
      if (response.success) {
        setConnectedDevices(response.data);
      }
    } catch (error) {
      console.error('📊 [LOGS] Connected devices fetch error:', error);
    }
  }, []);

  const detectICS = useCallback(async () => {
    try {
      const response = await logsService.detectICS();
      if (response.success) {
        setIcsInfo(response.data);
      }
    } catch (error) {
      console.error('📊 [LOGS] ICS detection error:', error);
    }
  }, []);

  // ===========================================
  // TRAFFIC MONITORING CONTROLS
  // ===========================================
  const handleStartMonitoring = async () => {
    try {
      setIsLoading(true);
      const response = await logsService.startTrafficMonitoring();

      if (response.success) {
        setIsMonitoring(true);
        toast.success(response.message || 'Traffic monitoring başlatıldı');

        // Refresh status after a short delay
        setTimeout(() => {
          fetchMonitoringStatus();
          fetchDashboardStats();
        }, 2000);
      } else {
        toast.error(response.error);
      }
    } catch (error) {
      console.error('📊 [LOGS] Start monitoring error:', error);
      toast.error('Monitoring başlatılamadı');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopMonitoring = async () => {
    try {
      setIsLoading(true);
      const response = await logsService.stopTrafficMonitoring();

      if (response.success) {
        setIsMonitoring(false);
        toast.success(response.message || 'Traffic monitoring durduruldu');

        // Refresh status after a short delay
        setTimeout(() => {
          fetchMonitoringStatus();
        }, 2000);
      } else {
        toast.error(response.error);
      }
    } catch (error) {
      console.error('📊 [LOGS] Stop monitoring error:', error);
      toast.error('Monitoring durdurulamadı');
    } finally {
      setIsLoading(false);
    }
  };

  // ===========================================
  // FILTER HANDLING
  // ===========================================
  const handleFilterChange = useCallback((key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    setCurrentPage(1); // Reset to first page when filtering
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({
      keyword: '',
      level: 'Tümü',
      startDate: '',
      endDate: '',
      sourceIp: '',
      deviceIp: ''
    });
    setCurrentPage(1);
    setNewLogsCount(0);
  }, []);

  // ===========================================
  // EXPORT HANDLING
  // ===========================================
  const handleExport = async (format) => {
    try {
      setIsExporting(true);

      const params = {
        keyword: filters.keyword || undefined,
        level: filters.level !== 'Tümü' ? filters.level : undefined,
        device_ip: filters.deviceIp || undefined,
        start_date: filters.startDate || undefined,
        end_date: filters.endDate || undefined,
        limit: 50000
      };

      const response = await logsService.exportLogs(format, params);

      if (response.success) {
        toast.success(response.message || `${format.toUpperCase()} dosyası başarıyla indirildi`);
      } else {
        toast.error(response.error);
      }
    } catch (error) {
      console.error('📊 [LOGS] Export error:', error);
      toast.error('Dışa aktarma işlemi başarısız');
    } finally {
      setIsExporting(false);
    }
  };

  // ===========================================
  // LOG MANAGEMENT
  // ===========================================
  const handleClearLogs = async () => {
    if (!window.confirm('Tüm logları silmek istediğinizden emin misiniz? Bu işlem geri alınamaz!')) {
      return;
    }

    try {
      const response = await logsService.clearLogs();

      if (response.success) {
        setLogs([]);
        setTotalLogs(0);
        setCurrentPage(1);
        setRealtimeLogs([]);
        setNewLogsCount(0);
        toast.success(response.message || 'Loglar başarıyla temizlendi');

        // Refresh stats
        fetchDashboardStats();
      } else {
        toast.error(response.error);
      }
    } catch (error) {
      console.error('📊 [LOGS] Clear logs error:', error);
      toast.error('Loglar temizlenirken hata oluştu');
    }
  };

  const handleLogSelect = useCallback((logId) => {
    setSelectedLogs(prev =>
      prev.includes(logId)
        ? prev.filter(id => id !== logId)
        : [...prev, logId]
    );
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedLogs.length === logs.length) {
      setSelectedLogs([]);
    } else {
      setSelectedLogs(logs.map(log => log.id));
    }
  }, [selectedLogs.length, logs]);

  const handleViewLogDetail = async (log) => {
    try {
      // Try to get detailed info from backend
      if (log.id) {
        const response = await logsService.getLogDetail(log.id);
        if (response.success) {
          setSelectedLog(response.data);
        } else {
          setSelectedLog(log); // Fallback to existing data
        }
      } else {
        setSelectedLog(log);
      }
      setShowLogDetail(true);
    } catch (error) {
      console.error('📊 [LOGS] Log detail fetch error:', error);
      setSelectedLog(log); // Fallback to existing data
      setShowLogDetail(true);
    }
  };

  // ===========================================
  // SORTING
  // ===========================================
  const handleSort = useCallback((column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  }, [sortBy, sortOrder]);

  // ===========================================
  // NAVIGATION
  // ===========================================
  const handleLogout = async () => {
    try {
      console.log('📊 [LOGS] Logout başladı');
      await logout();
      toast.success('Başarıyla çıkış yapıldı');
    } catch (error) {
      console.error('📊 [LOGS] Logout error:', error);
      toast.error('Çıkış yapılırken hata oluştu');
    }
  };

  const handleMenuClick = useCallback((menuId) => {
    console.log('📊 [LOGS] Menu tıklandı:', menuId);
    if (menuId === 'logs') {
      setActiveMenu(menuId);
      return;
    }

    // Navigation
    const routes = {
      'home': '/dashboard',
      'updates': '/updates',
      'reports': '/reports',
      'settings': '/settings',
      'nat-settings': '/nat-settings',
      'dns-management': '/dns-management',
      'routes': '/routes',
      'rule-groups': '/rule-groups',
      'security-rules': '/security-rules',
      'interface-settings': '/interface-settings'
    };

    navigate(routes[menuId] || '/dashboard');
  }, [navigate]);

  // ===========================================
  // UTILITY FUNCTIONS
  // ===========================================
  const getLogLevelColor = useCallback((level) => {
    const colors = {
      'ALLOW': 'text-green-400 bg-green-500/10 border-green-500/30',
      'BLOCK': 'text-red-400 bg-red-500/10 border-red-500/30',
      'DENY': 'text-red-400 bg-red-500/10 border-red-500/30',
      'DROP': 'text-orange-400 bg-orange-500/10 border-orange-500/30',
      'REJECT': 'text-red-400 bg-red-500/10 border-red-500/30',
      'INFO': 'text-blue-400 bg-blue-500/10 border-blue-500/30',
      'WARNING': 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
      'ERROR': 'text-red-400 bg-red-500/10 border-red-500/30',
      'CRITICAL': 'text-purple-400 bg-purple-500/10 border-purple-500/30',
      'DEBUG': 'text-gray-400 bg-gray-500/10 border-gray-500/30'
    };
    return colors[level] || 'text-gray-400 bg-gray-500/10 border-gray-500/30';
  }, []);

  const formatTimestamp = useCallback((timestamp) => {
    return new Date(timestamp).toLocaleString('tr-TR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }, []);

  const formatBytes = useCallback((bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  // ===========================================
  // MEMOIZED COMPONENTS
  // ===========================================
  const StatCard = React.memo(({ title, value, icon, color, subtitle }) => (
    <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-4 hover:bg-slate-800/70 transition-all duration-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm font-medium mb-1">{title}</p>
          <p className="font-bold text-2xl text-white">{value}</p>
          {subtitle && <p className="text-gray-500 text-xs mt-1">{subtitle}</p>}
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          {icon}
        </div>
      </div>
    </div>
  ));

  const totalPages = Math.ceil(totalLogs / pageSize);

  console.log('📊 [LOGS] Component render ediliyor, state:', {
    activeMenu,
    isLoading,
    logsCount: logs.length,
    totalLogs,
    currentPage,
    isMonitoring,
    realTimeConnection
  });

  // ===========================================
  // RENDER
  // ===========================================
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
                <h2 className="text-xl font-semibold text-white">Sistem Günlükleri</h2>
                <span className="text-gray-400 text-sm">Güvenlik duvarı etkinlikleri izleyin ve analiz edin</span>
                <DataPersistenceIndicator />
                <RealTimeIndicator />
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                    showFilters ? 'bg-blue-600 text-white' : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                  }`}
                >
                  <FaFilter className="text-sm" />
                  <span>Filtreler ve Dışa Aktarım</span>
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Toplam Log Sayısı"
              value={dashboardStats.total_logs?.toLocaleString() || '0'}
              icon={<FaDatabase />}
              color="text-blue-400 bg-blue-500/10"
              subtitle={`Son güncelleme: ${dashboardStats.last_updated ? new Date(dashboardStats.last_updated).toLocaleTimeString('tr-TR') : 'Bilinmiyor'}`}
            />
            <StatCard
              title="Engellenen İstekler"
              value={dashboardStats.blocked_requests?.toLocaleString() || '0'}
              icon={<FaBan />}
              color="text-red-400 bg-red-500/10"
            />
            <StatCard
              title="İzin Verilen İstekler"
              value={dashboardStats.allowed_requests?.toLocaleString() || '0'}
              icon={<FaCheckCircle />}
              color="text-green-400 bg-green-500/10"
            />
            <StatCard
              title="Sistem Uyarıları"
              value={dashboardStats.system_warnings?.toLocaleString() || '0'}
              icon={<FaExclamationTriangle />}
              color="text-yellow-400 bg-yellow-500/10"
            />
          </div>

          {/* Traffic Monitoring Control Panel */}
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <FaNetworkWired className="text-blue-400 text-xl" />
                <h3 className="text-white font-semibold text-lg">Traffic Monitoring</h3>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  isMonitoring
                    ? 'bg-green-500/20 text-green-300'
                    : 'bg-red-500/20 text-red-300'
                }`}>
                  {isMonitoring ? 'Aktif' : 'Devre Dışı'}
                </span>
                {realTimeConnection && (
                  <span className="flex items-center space-x-1 text-green-400 text-sm">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span>Canlı Bağlantı</span>
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-3">
                {!isMonitoring ? (
                  <button
                    onClick={handleStartMonitoring}
                    disabled={isLoading}
                    className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <FaPlay className="text-sm" />
                    <span>Monitoring Başlat</span>
                  </button>
                ) : (
                  <button
                    onClick={handleStopMonitoring}
                    disabled={isLoading}
                    className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <FaStop className="text-sm" />
                    <span>Monitoring Durdur</span>
                  </button>
                )}
              </div>
            </div>

            {/* Monitoring Status Grid */}
            {monitoringStatus && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-900/40 rounded-lg p-4">
                  <p className="text-gray-400 text-sm">Platform</p>
                  <p className="text-white font-medium">{monitoringStatus.platform || 'N/A'}</p>
                </div>
                <div className="bg-slate-900/40 rounded-lg p-4">
                  <p className="text-gray-400 text-sm">Interface</p>
                  <p className="text-white font-medium">{monitoringStatus.interface || 'N/A'}</p>
                </div>
                <div className="bg-slate-900/40 rounded-lg p-4">
                  <p className="text-gray-400 text-sm">Yakalanan Paket</p>
                  <p className="text-white font-medium">{monitoringStatus.packets_captured?.toLocaleString() || '0'}</p>
                </div>
                <div className="bg-slate-900/40 rounded-lg p-4">
                  <p className="text-gray-400 text-sm">İşlenen Paket</p>
                  <p className="text-white font-medium">{monitoringStatus.packets_processed?.toLocaleString() || '0'}</p>
                </div>
              </div>
            )}

            {/* ICS Information */}
            {icsInfo && (
              <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div className="flex items-start space-x-3">
                  <FaInfoCircle className="text-blue-400 text-lg mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-blue-200 font-medium mb-1">ICS Kurulum Bilgisi</p>
                    <p className="text-blue-200/80 text-sm">
                      Platform: {icsInfo.platform} |
                      WAN: {icsInfo.wan_interface || 'Bulunamadı'} |
                      LAN: {icsInfo.lan_interface || 'Bulunamadı'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6 mb-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-white font-semibold text-lg">Filtreler ve Dışa Aktarım</h3>
                <button
                  onClick={() => setShowFilters(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <FaTimes />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* Anahtar Kelime */}
                <div>
                  <label className="block text-gray-300 font-medium mb-2">Anahtar Kelime</label>
                  <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                    <input
                      type="text"
                      value={filters.keyword}
                      onChange={(e) => handleFilterChange('keyword', e.target.value)}
                      placeholder="IP, mesaj araması..."
                      className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-10 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Log Seviyesi */}
                <div>
                  <label className="block text-gray-300 font-medium mb-2">Log Seviyesi</label>
                  <select
                    value={filters.level}
                    onChange={(e) => handleFilterChange('level', e.target.value)}
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {logLevels.map((level) => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                </div>

                {/* Başlangıç Tarihi */}
                <div>
                  <label className="block text-gray-300 font-medium mb-2">Başlangıç Tarihi</label>
                  <input
                    type="datetime-local"
                    value={filters.startDate}
                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Bitiş Tarihi */}
                <div>
                  <label className="block text-gray-300 font-medium mb-2">Bitiş Tarihi</label>
                  <input
                    type="datetime-local"
                    value={filters.endDate}
                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <button
                  onClick={handleClearFilters}
                  className="flex items-center space-x-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <FaTimes className="text-sm" />
                  <span>Temizle</span>
                </button>

                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => handleExport('csv')}
                    disabled={isExporting}
                    className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <FaDownload className="text-sm" />
                    <span>CSV</span>
                  </button>

                  <button
                    onClick={() => handleExport('json')}
                    disabled={isExporting}
                    className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <FaDownload className="text-sm" />
                    <span>JSON</span>
                  </button>

                  <button
                    onClick={() => handleExport('pdf')}
                    disabled={isExporting}
                    className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <FaDownload className="text-sm" />
                    <span>PDF</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Real-time Notification */}
          {newLogsCount > 0 && currentPage === 1 && (
            <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                  <span className="text-blue-300 text-sm font-medium">
                    {newLogsCount} yeni log alındı ve tabloya eklendi
                  </span>
                </div>
                <button
                  onClick={() => setNewLogsCount(0)}
                  className="text-blue-400 hover:text-blue-300"
                >
                  <FaTimes className="text-sm" />
                </button>
              </div>
            </div>
          )}

          {/* Son Etkinlikler */}
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <FaChartBar className="text-blue-400 text-xl" />
                <h3 className="text-white font-semibold text-lg">Son Etkinlikler ({pageSize} Sonuç)</h3>
                <span className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full text-xs font-medium">
                  {totalLogs.toLocaleString()} toplam kayıt
                </span>
                {realTimeConnection && (
                  <span className="bg-green-500/20 text-green-300 px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1">
                    <FaWifi className="text-xs" />
                    <span>Canlı</span>
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={fetchLogs}
                  disabled={isLoading}
                  className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  <FaSync className={`text-sm ${isLoading ? 'animate-spin' : ''}`} />
                  <span>Yenile</span>
                </button>
                <button
                  onClick={handleClearLogs}
                  className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <FaTrash className="text-sm" />
                  <span>Logları Temizle</span>
                </button>
              </div>
            </div>

            {/* Logs Table */}
            <div className="overflow-x-auto">
              {logs.length > 0 ? (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700/50">
                      <th className="text-left py-3 px-4">
                        <input
                          type="checkbox"
                          checked={selectedLogs.length === logs.length && logs.length > 0}
                          onChange={handleSelectAll}
                          className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500"
                        />
                      </th>
                      <th
                        className="text-left py-3 px-4 text-gray-400 font-medium cursor-pointer hover:text-white transition-colors"
                        onClick={() => handleSort('timestamp')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Tarih/Saat</span>
                          {sortBy === 'timestamp' && (
                            sortOrder === 'asc' ? <FaChevronUp className="text-xs" /> : <FaChevronDown className="text-xs" />
                          )}
                        </div>
                      </th>
                      <th
                        className="text-left py-3 px-4 text-gray-400 font-medium cursor-pointer hover:text-white transition-colors"
                        onClick={() => handleSort('source_ip')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Kaynak IP</span>
                          {sortBy === 'source_ip' && (
                            sortOrder === 'asc' ? <FaChevronUp className="text-xs" /> : <FaChevronDown className="text-xs" />
                          )}
                        </div>
                      </th>
                      <th
                        className="text-left py-3 px-4 text-gray-400 font-medium cursor-pointer hover:text-white transition-colors"
                        onClick={() => handleSort('destination_ip')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Hedef IP</span>
                          {sortBy === 'destination_ip' && (
                            sortOrder === 'asc' ? <FaChevronUp className="text-xs" /> : <FaChevronDown className="text-xs" />
                          )}
                        </div>
                      </th>
                      <th
                        className="text-left py-3 px-4 text-gray-400 font-medium cursor-pointer hover:text-white transition-colors"
                        onClick={() => handleSort('level')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Seviye</span>
                          {sortBy === 'level' && (
                            sortOrder === 'asc' ? <FaChevronUp className="text-xs" /> : <FaChevronDown className="text-xs" />
                          )}
                        </div>
                      </th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Mesaj</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log, index) => (
                      <tr key={log.id || index} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={selectedLogs.includes(log.id)}
                            onChange={() => handleLogSelect(log.id)}
                            className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500"
                          />
                        </td>
                        <td className="py-3 px-4 text-gray-300 text-sm font-mono">
                          <div>{formatTimestamp(log.timestamp)}</div>
                          <div className="text-gray-500 text-xs">{log.timezone || 'UTC+3'}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-white font-medium">{log.source_ip}</div>
                          {log.source_port && (
                            <div className="text-gray-400 text-xs">Port: {log.source_port}</div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-white font-medium">{log.destination_ip}</div>
                          {log.destination_port && (
                            <div className="text-gray-400 text-xs">Port: {log.destination_port}</div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getLogLevelColor(log.level)}`}>
                            {log.level}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-white max-w-md truncate" title={log.message}>
                            {log.message}
                          </div>
                          {log.application && log.application !== 'UNKNOWN' && (
                            <div className="text-gray-400 text-xs mt-1">
                              {log.protocol}: {log.application}
                            </div>
                          )}
                          {log.blocked && (
                            <div className="text-red-400 text-xs mt-1 flex items-center space-x-1">
                              <FaBan className="text-xs" />
                              <span>Engellendi</span>
                            </div>
                          )}
                          {log.threat_detected && (
                            <div className="text-orange-400 text-xs mt-1 flex items-center space-x-1">
                              <FaExclamationTriangle className="text-xs" />
                              <span>Tehdit Tespit Edildi</span>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleViewLogDetail(log)}
                            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
                          >
                            <FaEye className="text-xs" />
                            <span>İncele</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-12">
                  <FaDatabase className="text-gray-500 text-4xl mb-4 mx-auto" />
                  <h4 className="text-white font-medium mb-2">
                    {isLoading ? 'Loglar yükleniyor...' : 'Henüz log kaydı yok'}
                  </h4>
                  <p className="text-gray-400 text-sm mb-6">
                    {isLoading ? 'Lütfen bekleyin...' : isMonitoring ? 'Traffic monitoring aktif, loglar yakında görünecek' : 'Traffic monitoring başlatarak log toplamaya başlayın'}
                  </p>
                  {!isMonitoring && !isLoading && (
                    <button
                      onClick={handleStartMonitoring}
                      className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-colors flex items-center space-x-2 mx-auto"
                    >
                      <FaPlay className="text-sm" />
                      <span>Traffic Monitoring Başlat</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-700/50">
                <div className="text-gray-400 text-sm">
                  Sayfa {currentPage} / {totalPages} ({totalLogs.toLocaleString()} toplam kayıt)
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="flex items-center space-x-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FaChevronLeft className="text-sm" />
                    <span>Önceki</span>
                  </button>
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                            currentPage === pageNum
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="flex items-center space-x-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>Sonraki</span>
                    <FaChevronRight className="text-sm" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Connected Devices Panel */}
          {connectedDevices.length > 0 && (
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6 mb-8">
              <div className="flex items-center space-x-3 mb-6">
                <FaDesktop className="text-green-400 text-xl" />
                <h3 className="text-white font-semibold text-lg">Bağlı Cihazlar</h3>
                <span className="bg-green-500/20 text-green-300 px-2 py-1 rounded-full text-xs font-medium">
                  {connectedDevices.length} aktif cihaz
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {connectedDevices.slice(0, 6).map((device, index) => (
                  <div key={device.device_ip || index} className="bg-slate-900/40 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-medium">{device.device_ip}</span>
                      <span className={`w-2 h-2 rounded-full ${device.is_online ? 'bg-green-400' : 'bg-red-400'}`}></span>
                    </div>
                    <div className="text-gray-400 text-sm">
                      <div>Hostname: {device.hostname || 'N/A'}</div>
                      <div>Paket: {device.total_packets?.toLocaleString() || '0'}</div>
                      <div>Veri: {formatBytes(device.total_bytes || 0)}</div>
                    </div>
                  </div>
                ))}
              </div>
              {connectedDevices.length > 6 && (
                <div className="text-center mt-4">
                  <span className="text-gray-400 text-sm">
                    +{connectedDevices.length - 6} daha fazla cihaz
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Log Information */}
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6">
            <div className="flex items-center space-x-3 mb-6">
              <FaInfoCircle className="text-blue-400 text-xl" />
              <h3 className="text-white font-semibold text-lg">Sistem Günlükleri Hakkında</h3>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-white font-medium mb-2">Log Seviyeleri:</h4>
                  <p className="text-gray-400 text-sm">ALLOW (İzin), BLOCK/DENY/DROP/REJECT (Engelleme), WARNING (Uyarı), ERROR (Hata), CRITICAL (Kritik), INFO (Bilgi), DEBUG (Hata Ayıklama)</p>
                </div>
                <div>
                  <h4 className="text-white font-medium mb-2">Gerçek Zamanlı İzleme:</h4>
                  <p className="text-gray-400 text-sm">Loglar WebSocket ile anlık olarak güncellenir. Bağlantı durumu üst menüde gösterilir.</p>
                </div>
                <div>
                  <h4 className="text-white font-medium mb-2">Traffic Monitoring:</h4>
                  <p className="text-gray-400 text-sm">ICS (Internet Connection Sharing) trafiğini yakalayarak tüm ağ etkinliklerini izler.</p>
                </div>
                <div>
                  <h4 className="text-white font-medium mb-2">Dışa Aktarım:</h4>
                  <p className="text-gray-400 text-sm">Logları CSV, JSON veya PDF formatında dışa aktarabilir, analiz için kullanabilirsiniz.</p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Log Detail Modal */}
      {showLogDetail && selectedLog && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowLogDetail(false)} />
            <span className="hidden sm:inline-block sm:h-screen sm:align-middle">&#8203;</span>
            <div className="inline-block w-full max-w-4xl transform overflow-hidden rounded-lg bg-slate-800 text-left align-bottom shadow-xl transition-all sm:my-8 sm:align-middle">
              <div className="bg-slate-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-white">Log Detayları</h3>
                  <button
                    onClick={() => setShowLogDetail(false)}
                    className="rounded-md bg-slate-800 text-gray-400 hover:text-gray-300 focus:outline-none"
                  >
                    <FaTimes />
                  </button>
                </div>
                <div className="space-y-6">
                  {/* Temel Bilgiler */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-gray-400 text-sm">Zaman Damgası</label>
                      <p className="text-white font-medium">{formatTimestamp(selectedLog.timestamp)}</p>
                    </div>
                    <div>
                      <label className="text-gray-400 text-sm">Log Seviyesi</label>
                      <div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getLogLevelColor(selectedLog.level)}`}>
                          {selectedLog.level}
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="text-gray-400 text-sm">Kaynak IP</label>
                      <p className="text-white font-medium">{selectedLog.source_ip}</p>
                    </div>
                    <div>
                      <label className="text-gray-400 text-sm">Kaynak Port</label>
                      <p className="text-white font-medium">{selectedLog.source_port || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-gray-400 text-sm">Hedef IP</label>
                      <p className="text-white font-medium">{selectedLog.destination_ip}</p>
                    </div>
                    <div>
                      <label className="text-gray-400 text-sm">Hedef Port</label>
                      <p className="text-white font-medium">{selectedLog.destination_port || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-gray-400 text-sm">Protokol</label>
                      <p className="text-white font-medium">{selectedLog.protocol || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-gray-400 text-sm">Uygulama</label>
                      <p className="text-white font-medium">{selectedLog.application || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-gray-400 text-sm">Cihaz IP</label>
                      <p className="text-white font-medium">{selectedLog.device_ip || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-gray-400 text-sm">Veri Boyutu</label>
                      <p className="text-white font-medium">{formatBytes(selectedLog.bytes_transferred || 0)}</p>
                    </div>
                  </div>

                  {/* Mesaj */}
                  <div>
                    <label className="text-gray-400 text-sm">Mesaj</label>
                    <div className="bg-slate-900/50 rounded-lg p-4 mt-2">
                      <p className="text-white">{selectedLog.message}</p>
                    </div>
                  </div>

                  {/* Güvenlik Bilgileri */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-gray-400 text-sm">Engellendi</label>
                      <div className="flex items-center space-x-2 mt-1">
                        {selectedLog.blocked ? (
                          <>
                            <FaBan className="text-red-400 text-sm" />
                            <span className="text-red-400 font-medium">Evet</span>
                          </>
                        ) : (
                          <>
                            <FaCheckCircle className="text-green-400 text-sm" />
                            <span className="text-green-400 font-medium">Hayır</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="text-gray-400 text-sm">Tehdit Tespit Edildi</label>
                      <div className="flex items-center space-x-2 mt-1">
                        {selectedLog.threat_detected ? (
                          <>
                            <FaExclamationTriangle className="text-orange-400 text-sm" />
                            <span className="text-orange-400 font-medium">Evet</span>
                          </>
                        ) : (
                          <>
                            <FaCheckCircle className="text-green-400 text-sm" />
                            <span className="text-green-400 font-medium">Hayır</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Ek Detaylar */}
                  {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
                    <div>
                      <label className="text-gray-400 text-sm">Ek Detaylar</label>
                      <div className="bg-slate-900/50 rounded-lg p-4 mt-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {selectedLog.details.http_method && (
                            <div>
                              <span className="text-gray-400 text-xs">HTTP Method:</span>
                              <p className="text-white text-sm">{selectedLog.details.http_method}</p>
                            </div>
                          )}
                          {selectedLog.details.http_url && (
                            <div>
                              <span className="text-gray-400 text-xs">HTTP URL:</span>
                              <p className="text-white text-sm break-all">{selectedLog.details.http_url}</p>
                            </div>
                          )}
                          {selectedLog.details.http_host && (
                            <div>
                              <span className="text-gray-400 text-xs">HTTP Host:</span>
                              <p className="text-white text-sm">{selectedLog.details.http_host}</p>
                            </div>
                          )}
                          {selectedLog.details.dns_query && (
                            <div>
                              <span className="text-gray-400 text-xs">DNS Query:</span>
                              <p className="text-white text-sm">{selectedLog.details.dns_query}</p>
                            </div>
                          )}
                          {selectedLog.details.http_user_agent && (
                            <div className="md:col-span-2">
                              <span className="text-gray-400 text-xs">User Agent:</span>
                              <p className="text-white text-sm break-all">{selectedLog.details.http_user_agent}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Coğrafi Bilgiler */}
                  {(selectedLog.geo_country || selectedLog.geo_city) && (
                    <div>
                      <label className="text-gray-400 text-sm">Coğrafi Konum</label>
                      <div className="bg-slate-900/50 rounded-lg p-4 mt-2">
                        <div className="flex items-center space-x-4">
                          <FaGlobe className="text-blue-400" />
                          <div>
                            <p className="text-white">
                              {selectedLog.geo_city && `${selectedLog.geo_city}, `}
                              {selectedLog.geo_country}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* JSON Görünümü */}
                  <div>
                    <label className="text-gray-400 text-sm">Tam Log Verisi (JSON)</label>
                    <div className="bg-slate-900/50 rounded-lg p-4 mt-2 max-h-64 overflow-y-auto">
                      <pre className="text-gray-300 text-xs font-mono whitespace-pre-wrap">
                        {JSON.stringify(selectedLog, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setShowLogDetail(false)}
                    className="bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg transition-colors"
                  >
                    Kapat
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

export default Logs;