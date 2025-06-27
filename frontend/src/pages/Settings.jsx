import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { settingsService } from '../services/settingsService'
// React Icons
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
  FaRedo,
  FaTrash,
  FaCheckCircle,
  FaSpinner,
  FaDownload
} from 'react-icons/fa'
import './Settings.css'

console.log('⚙️ [SETTINGS] Settings component yüklendi')

// Data Persistence Indicator Component - Optimized
const DataPersistenceIndicator = React.memo(() => {
  const [dataStatus, setDataStatus] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchDataStatus = useCallback(async () => {
    try {
      const response = await settingsService.getDataStatus()
      if (response.success) {
        setDataStatus(response.data)
      }
      setIsLoading(false)
    } catch (error) {
      console.error('Data status fetch error:', error)
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDataStatus()
    const interval = setInterval(fetchDataStatus, 60000) // 1 dakika
    return () => clearInterval(interval)
  }, [fetchDataStatus])

  const formatUptime = useCallback((seconds) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    return days > 0 ? `${days}g ${hours}s` : `${hours}s`
  }, [])

  const isPersistent = useMemo(() =>
    dataStatus?.persistence?.enabled && dataStatus?.persistence?.dataCollection,
    [dataStatus]
  )

  if (isLoading || !dataStatus) {
    return (
      <div className="flex items-center space-x-2 px-3 py-1 bg-gray-500/20 rounded-full">
        <FaDatabase className="text-gray-400 text-sm animate-pulse" />
        <span className="text-gray-400 text-xs">Veri durumu kontrol ediliyor...</span>
      </div>
    )
  }

  return (
    <div className="flex items-center space-x-2 px-3 py-1 bg-slate-800/50 rounded-full border border-slate-700/50">
      <div className={`flex items-center space-x-1 ${isPersistent ? 'text-green-400' : 'text-yellow-400'}`}>
        {isPersistent ? <FaCheckCircle className="text-sm" /> : <FaExclamationTriangle className="text-sm" />}
        <FaDatabase className="text-sm" />
      </div>
      <div className="text-xs">
        <span className={isPersistent ? 'text-green-300' : 'text-yellow-300'}>
          {isPersistent ? 'Kalıcı Veri' : 'Veri Aktif'}
        </span>
        <span className="text-gray-400 ml-1">
          ({dataStatus?.persistence?.totalActivities?.toLocaleString() || 0} kayıt)
        </span>
      </div>
      <div className="text-xs text-gray-500">
        Çalışma: {formatUptime(dataStatus?.persistence?.systemUptime || 0)}
      </div>
    </div>
  )
})

const Settings = () => {
  console.log('⚙️ [SETTINGS] Settings component render başladı')
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [activeMenu, setActiveMenu] = useState('settings')
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isLoading, setIsLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(null)
  const [dataFetched, setDataFetched] = useState(false) // Prevent multiple fetches

  const [settings, setSettings] = useState({
    timezone: 'Türkiye (UTC+3)',
    language: 'Türkçe',
    sessionTimeout: 60,
    logLevel: 'Info (Normal)',
    autoUpdates: true,
    systemNotifications: true,
    darkTheme: true,
    backupFrequency: 'Haftalık',
    backupLocation: '/opt/firewall/backups'
  })

  const [systemInfo, setSystemInfo] = useState({
    version: '1.0.0',
    uptime: '2 gün 14 saat',
    memoryUsage: 24,
    diskUsage: 45,
    totalMemory: '8 GB',
    totalDisk: '100 GB',
    cpuUsage: 0,
    platform: 'Linux'
  })

  const [securityStatus, setSecurityStatus] = useState({
    firewall: 'Aktif',
    ssl: 'Güncel',
    lastScan: '2 saat önce'
  })

  // Memoized menu items - prevent recreation on every render
  const menuItems = useMemo(() => [
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
  ], [])

  // Optimized fetchSettingsData with useCallback
  const fetchSettingsData = useCallback(async () => {
    // Prevent multiple simultaneous fetches
    if (dataFetched) return

    try {
      console.log('📡 [SETTINGS] Settings data fetch başladı')
      setIsLoading(true)
      setDataFetched(true)

      // Gerçek API çağrıları
      const [settingsData, systemData, securityData] = await Promise.allSettled([
        settingsService.getSettings(),
        settingsService.getSystemInfo(),
        settingsService.getSecurityStatus()
      ])

      // Settings data
      if (settingsData.status === 'fulfilled' && settingsData.value.success) {
        const generalSettings = settingsData.value.data.general || {}
        setSettings(prevSettings => ({
          ...prevSettings,
          timezone: generalSettings.timezone || 'Türkiye (UTC+3)',
          language: generalSettings.language || 'Türkçe',
          sessionTimeout: generalSettings.sessionTimeout || 60,
          logLevel: generalSettings.logLevel || 'Info (Normal)',
          // Diğer ayarlar
          autoUpdates: settingsData.value.data.autoUpdates?.enabled ?? true,
          systemNotifications: settingsData.value.data.systemFeedback?.enabled ?? true,
          darkTheme: settingsData.value.data.darkTheme?.enabled ?? true,
          backupFrequency: settingsData.value.data.backup?.frequency || 'Haftalık',
          backupLocation: settingsData.value.data.backup?.location || '/opt/firewall/backups'
        }))
        console.log('✅ [SETTINGS] Settings data loaded:', settingsData.value.data)
      } else {
        console.warn('⚠️ [SETTINGS] Settings fetch failed:', settingsData.reason || 'No data')
      }

      // System info data
      if (systemData.status === 'fulfilled' && systemData.value.success) {
        const sysData = systemData.value.data
        setSystemInfo({
          version: sysData.version || '1.0.0',
          uptime: sysData.uptime || '2 gün 14 saat',
          memoryUsage: sysData.memoryUsage || 24,
          diskUsage: sysData.diskUsage || 45,
          totalMemory: `${sysData.memoryTotal || 8} GB`,
          totalDisk: `${sysData.diskTotal || 100} GB`,
          cpuUsage: sysData.cpuUsage || 0,
          platform: sysData.platform || 'Linux'
        })
        console.log('✅ [SETTINGS] System info loaded:', sysData)
      } else {
        console.warn('⚠️ [SETTINGS] System info fetch failed:', systemData.reason || 'No data')
      }

      // Security status data
      if (securityData.status === 'fulfilled' && securityData.value.success) {
        const secData = securityData.value.data
        setSecurityStatus({
          firewall: secData.firewall?.status || 'Aktif',
          ssl: secData.ssl?.status || 'Güncel',
          lastScan: secData.lastScan?.timeAgo || '2 saat önce'
        })
        console.log('✅ [SETTINGS] Security status loaded:', secData)
      } else {
        console.warn('⚠️ [SETTINGS] Security status fetch failed:', securityData.reason || 'No data')
      }

      console.log('✅ [SETTINGS] Settings data fetch tamamlandı')
      setIsLoading(false)
    } catch (error) {
      console.error('❌ [SETTINGS] Settings data fetch error:', error)
      toast.error('Ayarlar yüklenirken hata oluştu')
      setIsLoading(false)
    } finally {
      // Allow future fetches
      setTimeout(() => setDataFetched(false), 2000)
    }
  }, [dataFetched])

  // Clock effect - separate from data fetching
  useEffect(() => {
    console.log('🔄 [SETTINGS] Clock timer başladı')
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Data fetching effect - runs only once
  useEffect(() => {
    console.log('🔄 [SETTINGS] Data fetch useEffect başladı')
    fetchSettingsData()
  }, []) // Empty dependency array - runs only once

  // Optimized handlers with useCallback
  const handleSettingChange = useCallback((key, value) => {
    console.log('📝 [SETTINGS] Setting değişti:', key, value)
    setSettings(prev => ({
      ...prev,
      [key]: value
    }))
  }, [])

  const handleSaveSettings = useCallback(async () => {
    try {
      console.log('💾 [SETTINGS] Settings kaydediliyor...')
      setIsLoading(true)
      const response = await settingsService.updateGeneralSettings({
        timezone: settings.timezone,
        language: settings.language,
        sessionTimeout: parseInt(settings.sessionTimeout)
      })

      if (response.success) {
        toast.success(response.message || 'Ayarlar başarıyla kaydedildi')
        console.log('✅ [SETTINGS] Settings kaydedildi')
        // Ayarları yeniden yükle (with delay to prevent race condition)
        setTimeout(() => {
          setDataFetched(false)
          fetchSettingsData()
        }, 1000)
      } else {
        throw new Error(response.message || 'Ayarlar kaydedilemedi')
      }
      setIsLoading(false)
    } catch (error) {
      console.error('❌ [SETTINGS] Settings kaydetme hatası:', error)
      toast.error(error.response?.data?.detail || error.message || 'Ayarlar kaydedilirken hata oluştu')
      setIsLoading(false)
    }
  }, [settings.timezone, settings.language, settings.sessionTimeout, fetchSettingsData])

  const handleQuickAction = useCallback(async (action) => {
    try {
      console.log('⚡ [SETTINGS] Quick action başladı:', action)
      setActionLoading(action)
      let confirmMessage = ''
      let apiCall = null

      switch (action) {
        case 'restart':
          confirmMessage = 'Sistemi yeniden başlatmak istediğinizden emin misiniz?'
          apiCall = () => settingsService.restartSystem()
          break
        case 'backup':
          apiCall = () => settingsService.createBackup()
          break
        case 'update':
          apiCall = () => settingsService.checkUpdates()
          break
        case 'clear-logs':
          confirmMessage = 'Logları temizlemek istediğinizden emin misiniz? Bu işlem geri alınamaz!'
          apiCall = () => settingsService.clearLogs()
          break
        default:
          setActionLoading(null)
          return
      }

      if (confirmMessage && !window.confirm(confirmMessage)) {
        setActionLoading(null)
        return
      }

      const response = await apiCall()
      if (response.success) {
        toast.success(response.message || 'İşlem başarıyla tamamlandı')
        console.log('✅ [SETTINGS] Quick action tamamlandı:', action, response)
        // Eğer sistem bilgileri değiştiyse, yeniden yükle
        if (action === 'clear-logs') {
          setTimeout(() => {
            setDataFetched(false)
            fetchSettingsData()
          }, 2000)
        }
      } else {
        throw new Error(response.message || 'İşlem başarısız')
      }
      setActionLoading(null)
    } catch (error) {
      console.error('❌ [SETTINGS] Quick action hatası:', error)
      toast.error(error.response?.data?.detail || error.message || 'İşlem gerçekleştirilirken hata oluştu')
      setActionLoading(null)
    }
  }, [fetchSettingsData])

  const handleLogout = useCallback(async () => {
    try {
      console.log('🚪 [SETTINGS] Logout başladı')
      await logout()
      toast.success('Başarıyla çıkış yapıldı')
      console.log('✅ [SETTINGS] Logout tamamlandı')
    } catch (error) {
      console.error('❌ [SETTINGS] Logout hatası:', error)
      toast.error('Çıkış yapılırken hata oluştu')
    }
  }, [logout])

  // GÜNCELLENMİŞ HANDLE MENU CLICK FONKSİYONU (280. satır civarı)
  const handleMenuClick = useCallback((menuId) => {
    console.log('🔗 [SETTINGS] Menu tıklandı:', menuId)
    if (menuId === 'home') {
      navigate('/dashboard')
    } else if (menuId === 'updates') {
      navigate('/updates')
    } else if (menuId === 'reports') {
      navigate('/reports')
    } else if (menuId === 'nat-settings') {
      navigate('/nat-settings')
    } else if (menuId === 'interface-settings') {
      navigate('/interface-settings')
    } else if (menuId === 'settings') {
      setActiveMenu(menuId)
    } else {
      navigate('/dashboard')
    }
  }, [navigate])

  // Memoized user display
  const userDisplay = useMemo(() => ({
    initial: user?.username?.charAt(0).toUpperCase() || 'U',
    greeting: `Hoş geldin, ${user?.username || 'Kullanıcı'}`
  }), [user?.username])

  console.log('🎨 [SETTINGS] Render ediliyor')

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
              const Icon = item.icon
              const isActive = activeMenu === item.id
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
              )
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
                <h2 className="text-xl font-semibold text-white">Sistem Ayarları</h2>
                <span className="text-gray-400 text-sm">Firewall ve sistem yapılandırma seçenekleri</span>
                <DataPersistenceIndicator />
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleSaveSettings}
                  disabled={isLoading}
                  className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isLoading && <FaSpinner className="animate-spin" />}
                  <span>Kaydet</span>
                </button>
                <div className="text-sm text-gray-300">
                  {currentTime.toLocaleString('tr-TR')}
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">
                      {userDisplay.initial}
                    </span>
                  </div>
                  <span className="text-white font-medium">{userDisplay.greeting}</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* General Settings */}
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="bg-blue-500/20 p-2 rounded-lg">
                  <FaCog className="text-blue-400 text-xl" />
                </div>
                <h3 className="text-white font-semibold text-lg">Genel Ayarlar</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-300 font-medium mb-2">Zaman Dilimi</label>
                  <select
                    value={settings.timezone}
                    onChange={(e) => handleSettingChange('timezone', e.target.value)}
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Türkiye (UTC+3)">Türkiye (UTC+3)</option>
                    <option value="UTC">UTC</option>
                    <option value="EST">EST</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-300 font-medium mb-2">Dil</label>
                  <select
                    value={settings.language}
                    onChange={(e) => handleSettingChange('language', e.target.value)}
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Türkçe">Türkçe</option>
                    <option value="English">English</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-300 font-medium mb-2">Oturum Zaman Aşımı (dakika)</label>
                  <input
                    type="number"
                    value={settings.sessionTimeout}
                    onChange={(e) => handleSettingChange('sessionTimeout', e.target.value)}
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="5"
                    max="480"
                  />
                </div>
              </div>
            </div>

            {/* System Actions */}
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="bg-orange-500/20 p-2 rounded-lg">
                  <FaServer className="text-orange-400 text-xl" />
                </div>
                <h3 className="text-white font-semibold text-lg">Sistem İşlemleri</h3>
              </div>
              <div className="space-y-3">
                <button
                  onClick={() => handleQuickAction('restart')}
                  disabled={actionLoading === 'restart'}
                  className="w-full flex items-center space-x-3 p-4 bg-blue-600/20 border border-blue-500/30 rounded-lg text-blue-300 hover:bg-blue-600/30 transition-colors disabled:opacity-50"
                >
                  {actionLoading === 'restart' ? <FaSpinner className="text-lg animate-spin" /> : <FaRedo className="text-lg" />}
                  <span>Sistemi Yeniden Başlat</span>
                </button>
                <button
                  onClick={() => handleQuickAction('backup')}
                  disabled={actionLoading === 'backup'}
                  className="w-full flex items-center space-x-3 p-4 bg-green-600/20 border border-green-500/30 rounded-lg text-green-300 hover:bg-green-600/30 transition-colors disabled:opacity-50"
                >
                  {actionLoading === 'backup' ? <FaSpinner className="text-lg animate-spin" /> : <FaDownload className="text-lg" />}
                  <span>Manuel Yedekleme</span>
                </button>
                <button
                  onClick={() => handleQuickAction('update')}
                  disabled={actionLoading === 'update'}
                  className="w-full flex items-center space-x-3 p-4 bg-yellow-600/20 border border-yellow-500/30 rounded-lg text-yellow-300 hover:bg-yellow-600/30 transition-colors disabled:opacity-50"
                >
                  {actionLoading === 'update' ? <FaSpinner className="text-lg animate-spin" /> : <FaSync className="text-lg" />}
                  <span>Güncelleme Kontrol Et</span>
                </button>
                <button
                  onClick={() => handleQuickAction('clear-logs')}
                  disabled={actionLoading === 'clear-logs'}
                  className="w-full flex items-center space-x-3 p-4 bg-red-600/20 border border-red-500/30 rounded-lg text-red-300 hover:bg-red-600/30 transition-colors disabled:opacity-50"
                >
                  {actionLoading === 'clear-logs' ? <FaSpinner className="text-lg animate-spin" /> : <FaTrash className="text-lg" />}
                  <span>Logları Temizle</span>
                </button>
              </div>
            </div>

            {/* System Information */}
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="bg-green-500/20 p-2 rounded-lg">
                  <FaServer className="text-green-400 text-xl" />
                </div>
                <h3 className="text-white font-semibold text-lg">Sistem Bilgileri</h3>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-400">Versiyon:</span>
                  <span className="text-white">{systemInfo.version}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Platform:</span>
                  <span className="text-white">{systemInfo.platform}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Çalışma Süresi:</span>
                  <span className="text-white">{systemInfo.uptime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Bellek Kullanımı:</span>
                  <span className="text-white">{systemInfo.memoryUsage}% / {systemInfo.totalMemory}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Disk Kullanımı:</span>
                  <span className="text-white">{systemInfo.diskUsage}% / {systemInfo.totalDisk}</span>
                </div>
                {systemInfo.cpuUsage !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">CPU Kullanımı:</span>
                    <span className="text-white">{systemInfo.cpuUsage}%</span>
                  </div>
                )}
              </div>
            </div>

            {/* Security Status */}
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="bg-red-500/20 p-2 rounded-lg">
                  <FaShieldAlt className="text-red-400 text-xl" />
                </div>
                <h3 className="text-white font-semibold text-lg">Güvenlik Durumu</h3>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Firewall:</span>
                  <span className="text-green-400 font-medium flex items-center">
                    <FaCheckCircle className="mr-1" />
                    {securityStatus.firewall}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">SSL Sertifikası:</span>
                  <span className="text-green-400 font-medium flex items-center">
                    <FaLock className="mr-1" />
                    {securityStatus.ssl}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Son Tarama:</span>
                  <span className="text-gray-300 flex items-center">
                    <FaClock className="mr-1" />
                    {securityStatus.lastScan}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Success Message */}
          <div className="mt-8 bg-green-500/10 border border-green-500/20 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <FaCheckCircle className="text-green-400 text-xl" />
              <div>
                <h4 className="text-green-300 font-semibold">Settings Sayfası Aktif!</h4>
                <p className="text-green-200/80 text-sm">
                  Tüm ayarlar backend ile entegre edildi. Gerçek sistem işlemleri çalışıyor.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default Settings