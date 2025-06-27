import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import {
  FaShieldAlt,
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
  FaCog,
  FaServer,
  FaExclamationTriangle,
  FaCheckCircle,
  FaBan,
  FaClock,
  FaDatabase,
  FaChartLine,
  FaEye
} from 'react-icons/fa'

console.log('🏠 [DASHBOARD] Dashboard component dosyası yüklendi')

// Data Persistence Indicator Component
const DataPersistenceIndicator = () => {
  const [dataStatus, setDataStatus] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchDataStatus()
    const interval = setInterval(fetchDataStatus, 60000)
    return () => clearInterval(interval)
  }, [])

  const fetchDataStatus = async () => {
    try {
      // Simulate API call
      setTimeout(() => {
        setDataStatus({
          persistence: {
            enabled: true,
            dataCollection: true,
            totalActivities: 135421,
            systemUptime: 172800 // 2 days in seconds
          }
        })
        setIsLoading(false)
      }, 500)
    } catch (error) {
      console.error('Data status fetch error:', error)
      setIsLoading(false)
    }
  }

  if (isLoading || !dataStatus) {
    return (
      <div className="flex items-center space-x-2 px-3 py-1 bg-gray-500/20 rounded-full">
        <FaDatabase className="text-gray-400 text-sm animate-pulse" />
        <span className="text-gray-400 text-xs">Veri durumu kontrol ediliyor...</span>
      </div>
    )
  }

  const formatUptime = (seconds) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    return days > 0 ? `${days}g ${hours}s` : `${hours}s`
  }

  const isPersistent = dataStatus.persistence?.enabled && dataStatus.persistence?.dataCollection

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
  )
}

// Analytics Chart Component
const AnalyticsChart = () => {
  const [activeFilter, setActiveFilter] = useState('24h')
  const [chartData, setChartData] = useState({
    totalConnections: [],
    blockedConnections: []
  })

  const filters = [
    { key: '24h', label: '24sa' },
    { key: '7d', label: '7g' },
    { key: '30d', label: '30g' }
  ]

  useEffect(() => {
    const generateData = () => {
      const hours = Array.from({length: 24}, (_, i) => {
        const hour = i.toString().padStart(2, '0') + ':00'
        const totalConnections = Math.floor(Math.random() * 500) + 200
        const blockedConnections = Math.floor(totalConnections * (Math.random() * 0.2 + 0.05))
        return {
          time: hour,
          total: totalConnections,
          blocked: blockedConnections
        }
      })
      setChartData({
        totalConnections: hours.map(h => ({ time: h.time, value: h.total })),
        blockedConnections: hours.map(h => ({ time: h.time, value: h.blocked }))
      })
    }
    generateData()
    const interval = setInterval(generateData, 30000)
    return () => clearInterval(interval)
  }, [activeFilter])

  const maxValue = Math.max(
    ...chartData.totalConnections.map(d => d.value),
    ...chartData.blockedConnections.map(d => d.value)
  )

  return (
    <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <FaChartLine className="text-blue-400 text-xl" />
          <h3 className="text-white font-semibold text-lg">Analitik</h3>
        </div>
        <div className="flex bg-slate-700/50 rounded-lg p-1">
          {filters.map((filter) => (
            <button
              key={filter.key}
              onClick={() => setActiveFilter(filter.key)}
              className={`px-3 py-1 text-sm rounded-md transition-all ${
                activeFilter === filter.key
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>
      <p className="text-gray-400 text-sm mb-6">Zaman içindeki ağ etkinliği</p>

      {/* Chart Container */}
      <div className="relative h-64 bg-slate-900/30 rounded-lg p-4">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-500 py-4">
          <span>{maxValue}</span>
          <span>{Math.floor(maxValue * 0.75)}</span>
          <span>{Math.floor(maxValue * 0.5)}</span>
          <span>{Math.floor(maxValue * 0.25)}</span>
          <span>0</span>
        </div>

        {/* Chart Area */}
        <div className="ml-8 h-full relative">
          <svg className="w-full h-full" viewBox="0 0 800 200">
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => (
              <line
                key={index}
                x1="0"
                y1={200 - (ratio * 180)}
                x2="800"
                y2={200 - (ratio * 180)}
                stroke="#334155"
                strokeWidth="0.5"
                opacity="0.5"
              />
            ))}

            {/* Total Connections Line */}
            <path
              d={`M ${chartData.totalConnections.map((point, index) =>
                `${(index / (chartData.totalConnections.length - 1)) * 800},${200 - ((point.value / maxValue) * 180)}`
              ).join(' L ')}`}
              fill="none"
              stroke="#3B82F6"
              strokeWidth="3"
              className="drop-shadow-lg"
            />

            {/* Blocked Connections Line */}
            <path
              d={`M ${chartData.blockedConnections.map((point, index) =>
                `${(index / (chartData.blockedConnections.length - 1)) * 800},${200 - ((point.value / maxValue) * 180)}`
              ).join(' L ')}`}
              fill="none"
              stroke="#EF4444"
              strokeWidth="2"
              className="drop-shadow-lg"
            />

            {/* Area fill for total connections */}
            <path
              d={`M ${chartData.totalConnections.map((point, index) =>
                `${(index / (chartData.totalConnections.length - 1)) * 800},${200 - ((point.value / maxValue) * 180)}`
              ).join(' L ')} L 800,200 L 0,200 Z`}
              fill="url(#totalGradient)"
              opacity="0.1"
            />

            {/* Gradients */}
            <defs>
              <linearGradient id="totalGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style={{stopColor: '#3B82F6', stopOpacity: 0.3}} />
                <stop offset="100%" style={{stopColor: '#3B82F6', stopOpacity: 0}} />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* X-axis labels */}
        <div className="flex justify-between text-xs text-gray-500 mt-2 ml-8">
          {['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'].map((time, index) => (
            <span key={index}>{time}</span>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center space-x-6 mt-4">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          <span className="text-gray-400 text-sm">Toplam Bağlantı</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <span className="text-gray-400 text-sm">Engellenen</span>
        </div>
      </div>
    </div>
  )
}

// Recent Activity Component
const RecentActivity = () => {
  const [activities, setActivities] = useState([])

  const activityTypes = {
    blocked: { icon: FaBan, color: 'text-red-400', bg: 'bg-red-500/10' },
    allowed: { icon: FaCheckCircle, color: 'text-green-400', bg: 'bg-green-500/10' },
    warning: { icon: FaExclamationTriangle, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    info: { icon: FaShieldAlt, color: 'text-blue-400', bg: 'bg-blue-500/10' }
  }

  const generateActivity = () => {
    const domains = [
      'malware.com', 'github.com', 'suspicious-site.net', 'vercel.com',
      'api.example.com', 'safe-site.org', 'threat.xyz', 'legitimate-api.com'
    ]
    const ips = [
      '192.168.1.10', '10.0.0.15', '172.16.0.8', '192.168.1.25',
      '10.0.0.32', '172.16.0.45', '192.168.1.100', '10.0.0.200'
    ]
    const activityTemplates = [
      { type: 'blocked', message: 'Engellendi', detail: 'Kötü amaçlı site' },
      { type: 'allowed', message: 'İzin Verildi', detail: 'Güvenli bağlantı' },
      { type: 'blocked', message: 'Engellendi', detail: 'Şüpheli aktivite' },
      { type: 'warning', message: 'Uyarı', detail: 'Yüksek bant genişliği' },
      { type: 'info', message: 'Bilgi', detail: 'Kural güncellendi' }
    ]

    const template = activityTemplates[Math.floor(Math.random() * activityTemplates.length)]
    const domain = domains[Math.floor(Math.random() * domains.length)]
    const ip = ips[Math.floor(Math.random() * ips.length)]

    return {
      id: Date.now() + Math.random(),
      type: template.type,
      message: template.message,
      detail: template.detail,
      domain: domain,
      ip: ip,
      timestamp: new Date(),
      port: Math.floor(Math.random() * 65535) + 1
    }
  }

  useEffect(() => {
    // Initial activities
    const initialActivities = Array.from({length: 8}, () => generateActivity())
    setActivities(initialActivities)

    // Add new activity every 5 seconds
    const interval = setInterval(() => {
      setActivities(prev => {
        const newActivity = generateActivity()
        return [newActivity, ...prev.slice(0, 7)] // Keep only 8 most recent
      })
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const formatTime = (timestamp) => {
    const now = new Date()
    const diff = Math.floor((now - timestamp) / 1000)
    if (diff < 60) return `${diff} sn önce`
    if (diff < 3600) return `${Math.floor(diff / 60)} dk önce`
    if (diff < 86400) return `${Math.floor(diff / 3600)} sa önce`
    return `${Math.floor(diff / 86400)} gün önce`
  }

  return (
    <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6">
      <div className="flex items-center space-x-3 mb-6">
        <FaClock className="text-blue-400 text-xl" />
        <h3 className="text-white font-semibold text-lg">Son Etkinlik</h3>
      </div>
      <p className="text-gray-400 text-sm mb-4">Son ağ olayları</p>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {activities.map((activity) => {
          const ActivityIcon = activityTypes[activity.type].icon
          return (
            <div
              key={activity.id}
              className="flex items-start space-x-3 p-3 bg-slate-900/30 rounded-lg hover:bg-slate-900/50 transition-colors"
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${activityTypes[activity.type].bg}`}>
                <ActivityIcon className={`text-sm ${activityTypes[activity.type].color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-white font-medium text-sm">{activity.domain}</p>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    activity.type === 'blocked' ? 'bg-red-500/20 text-red-300' :
                    activity.type === 'allowed' ? 'bg-green-500/20 text-green-300' :
                    activity.type === 'warning' ? 'bg-yellow-500/20 text-yellow-300' :
                    'bg-blue-500/20 text-blue-300'
                  }`}>
                    {activity.message}
                  </span>
                </div>
                <p className="text-gray-400 text-xs mt-1">{activity.detail}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-gray-500 text-xs">
                    {activity.ip}:{activity.port}
                  </span>
                  <span className="text-gray-500 text-xs">
                    {formatTime(activity.timestamp)}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Stat Card Component
const StatCard = ({ title, value, subtitle, icon, color = 'blue', trend, size = 'normal' }) => {
  const getColorClasses = (color) => {
    const colors = {
      green: 'text-green-400 bg-green-500/10 border-green-500/20',
      blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
      yellow: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
      red: 'text-red-400 bg-red-500/10 border-red-500/20',
      purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
      gray: 'text-gray-400 bg-gray-500/10 border-gray-500/20'
    }
    return colors[color] || colors.blue
  }

  const getSizeClasses = (size) => {
    return size === 'large' ? 'p-6' : 'p-4'
  }

  return (
    <div className={`bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 ${getSizeClasses(size)} hover:bg-slate-800/70 transition-all duration-200`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-gray-400 text-sm font-medium mb-1">{title}</p>
          <p className={`font-bold ${size === 'large' ? 'text-3xl' : 'text-2xl'} text-white mb-1`}>
            {value}
          </p>
          {subtitle && (
            <p className="text-gray-500 text-xs">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center mt-2">
              <span className={`text-xs font-medium ${trend.positive ? 'text-green-400' : 'text-red-400'}`}>
                {trend.positive ? '+' : ''}{trend.value}
              </span>
              <span className="text-gray-500 text-xs ml-1">{trend.period}</span>
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
  )
}

const Dashboard = () => {
  console.log('🏠 [DASHBOARD] Dashboard component render başladı')
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [activeMenu, setActiveMenu] = useState('home')
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isLoading, setIsLoading] = useState(false)

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
  ]

  useEffect(() => {
    console.log('🏠 [DASHBOARD] Dashboard mounted')
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    setIsLoading(false)

    return () => {
      console.log('🏠 [DASHBOARD] Dashboard unmounted')
      clearInterval(timer)
    }
  }, [])

  const handleLogout = async () => {
    try {
      console.log('🏠 [DASHBOARD] Logout başladı')
      await logout()
      toast.success('Başarıyla çıkış yapıldı')
      console.log('🏠 [DASHBOARD] Logout tamamlandı')
    } catch (error) {
      console.error('🏠 [DASHBOARD] Logout hatası:', error)
      toast.error('Çıkış yapılırken hata oluştu')
    }
  }

  const handleMenuClick = (menuId) => {
    console.log('🔗 [DASHBOARD] Menu tıklandı:', menuId)

    // Logs için routing - YENİ EKLENDİ!
    if (menuId === 'logs') {
      console.log('📊 [DASHBOARD] Logs sayfasına yönlendiriliyor')
      navigate('/logs')
      return
    }

    // DNS Management'a direkt yönlendirme - EN ÖNEMLİ!
    if (menuId === 'dns-management') {
      console.log('➡️ [DASHBOARD] DNS Management sayfasına yönlendiriliyor')
      navigate('/dns-management')
      return
    }

    // Routes sayfasına yönlendirme - YENİ EKLENDİ!
    if (menuId === 'routes') {
      console.log('➡️ [DASHBOARD] Routes sayfasına yönlendiriliyor')
      navigate('/routes')
      return
    }

    // Rule Groups sayfasına yönlendirme - YENİ EKLENDİ!
    if (menuId === 'rule-groups') {
      console.log('➡️ [DASHBOARD] Rule Groups sayfasına yönlendiriliyor')
      navigate('/rule-groups')
      return
    }

    // Interface Settings sayfasına yönlendirme - YENİ EKLENDİ!
    if (menuId === 'interface-settings') {
      console.log('➡️ [DASHBOARD] Interface Settings sayfasına yönlendiriliyor')
      navigate('/interface-settings')
      return
    }

    // Security Rules sayfasına yönlendirme - YENİ EKLENDİ!
    if (menuId === 'security-rules') {
      console.log('🛡️ [DASHBOARD] Security Rules sayfasına yönlendiriliyor')
      navigate('/security-rules')
      return
    }

    // Diğer direkt sayfalar
    if (menuId === 'reports') {
      console.log('➡️ [DASHBOARD] Reports sayfasına yönlendiriliyor')
      navigate('/reports')
      return
    }

    if (menuId === 'settings') {
      console.log('➡️ [DASHBOARD] Settings sayfasına yönlendiriliyor')
      navigate('/settings')
      return
    }

    if (menuId === 'updates') {
      console.log('➡️ [DASHBOARD] Updates sayfasına yönlendiriliyor')
      navigate('/updates')
      return
    }

    if (menuId === 'nat-settings') {
      console.log('➡️ [DASHBOARD] NAT Settings sayfasına yönlendiriliyor')
      navigate('/nat-settings')
      return
    }

    // Dashboard içinde kalacak menüler
    if (menuId === 'home') {
      console.log('🏠 [DASHBOARD] Ana sayfa seçildi')
      setActiveMenu(menuId)
      return
    }

    // Fallback - bilinmeyen menü
    console.log('❓ [DASHBOARD] Bilinmeyen menu:', menuId)
    setActiveMenu(menuId)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-white">Dashboard yükleniyor...</p>
        </div>
      </div>
    )
  }

  console.log('🎨 [DASHBOARD] Dashboard render ediliyor, activeMenu:', activeMenu)

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
                <h2 className="text-xl font-semibold text-white">Ana Sayfa</h2>
                <span className="text-gray-400 text-sm">Güvenlik duvarı yapılandırması ve ayrıntılı günlük görünümü</span>
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
        <main className="p-8">
          {/* Top Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Durum"
              value="Aktif"
              subtitle="Güvenlik duvarı çalışıyor"
              icon={<FaCheckCircle />}
              color="green"
            />
            <StatCard
              title="Bağlı Cihazlar"
              value="5"
              subtitle="Güvenlik duvarı koruması kullanan cihazlar"
              icon={<FaServer />}
              color="blue"
            />
            <StatCard
              title="Aktif Kurallar"
              value="12"
              subtitle="Aktif güvenlik duvarı kuralları"
              icon={<FaExclamationTriangle />}
              color="yellow"
            />
            <StatCard
              title="Son Güncelleme"
              value="2sa önce"
              subtitle="Son yapılandırma değişikliği"
              icon={<FaClock />}
              color="gray"
            />
          </div>

          {/* Middle Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Toplam Bağlantı"
              value="135,421"
              subtitle="Geçen aydan %17"
              icon={<FaChartBar />}
              color="blue"
            />
            <StatCard
              title="Engellenen"
              value="23,543"
              subtitle="Güvenlik tehdidi engellendi %17,41"
              icon={<FaBan />}
              color="red"
            />
            <StatCard
              title="Tehditler"
              value="342"
              subtitle="Engellenen girişimler %13,51"
              icon={<FaExclamationTriangle />}
              color="yellow"
            />
            <StatCard
              title="Güvenlik"
              value="%98.7"
              subtitle="Güvenlik performansı"
              icon={<FaShieldAlt />}
              color="green"
            />
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Analytics Chart - Left Side */}
            <div className="xl:col-span-2">
              <AnalyticsChart />
            </div>

            {/* Recent Activity - Right Side */}
            <div>
              <RecentActivity />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default Dashboard