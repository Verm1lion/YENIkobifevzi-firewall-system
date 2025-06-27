import React, { useState, useEffect, useCallback } from 'react';
import {
  FaDatabase,
  FaCheckCircle,
  FaExclamationTriangle,
  FaClock,
  FaServer,
  FaHdd,
  FaChartLine,
  FaTimes,
  FaSync,
  FaInfoCircle,
  FaNetworkWired,
  FaShieldAlt,
  FaEye,
  FaWifi,
  FaBolt,
  FaHistory
} from 'react-icons/fa';
import { logsService } from '../services/logsService';

const DataPersistenceIndicator = ({
  className = '',
  size = 'normal',
  showDetails = true,
  onStatusChange = null,
  refreshInterval = 60000 // 1 minute default
}) => {
  // Enhanced data status state
  const [dataStatus, setDataStatus] = useState(null);
  const [realTimeStats, setRealTimeStats] = useState(null);
  const [trafficSummary, setTrafficSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [error, setError] = useState(null);

  // UI state
  const [isExpanded, setIsExpanded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // overview, traffic, performance

  // Performance tracking
  const [performanceHistory, setPerformanceHistory] = useState([]);

  // Enhanced fetch function with multiple data sources
  const fetchAllData = useCallback(async () => {
    try {
      setError(null);

      // Fetch multiple data sources in parallel
      const [dataStatusRes, realTimeStatsRes, trafficSummaryRes] = await Promise.allSettled([
        logsService.getDataStatus(),
        logsService.getRealTimeStats(),
        logsService.getTrafficSummary('1h')
      ]);

      // Process data status
      if (dataStatusRes.status === 'fulfilled' && dataStatusRes.value.success) {
        setDataStatus(dataStatusRes.value.data);
      }

      // Process real-time stats
      if (realTimeStatsRes.status === 'fulfilled' && realTimeStatsRes.value.success) {
        setRealTimeStats(realTimeStatsRes.value.data);

        // Add to performance history
        setPerformanceHistory(prev => {
          const newEntry = {
            timestamp: new Date(),
            logsPerMinute: realTimeStatsRes.value.data.logs_per_minute || 0,
            activeConnections: realTimeStatsRes.value.data.active_connections || 0,
            totalPackets: realTimeStatsRes.value.data.total_packets || 0
          };

          // Keep only last 20 entries
          const updated = [...prev, newEntry].slice(-20);
          return updated;
        });
      }

      // Process traffic summary
      if (trafficSummaryRes.status === 'fulfilled' && trafficSummaryRes.value.success) {
        setTrafficSummary(trafficSummaryRes.value.data);
      }

      setLastUpdate(new Date());

      // Notify parent if callback provided
      if (onStatusChange) {
        onStatusChange({
          dataStatus: dataStatusRes.status === 'fulfilled' ? dataStatusRes.value.data : null,
          realTimeStats: realTimeStatsRes.status === 'fulfilled' ? realTimeStatsRes.value.data : null,
          isHealthy: dataStatusRes.status === 'fulfilled' && dataStatusRes.value.success
        });
      }

    } catch (error) {
      console.error('Enhanced data status fetch error:', error);
      setError('Veri durumu alınamadı');

      if (onStatusChange) {
        onStatusChange({ error: error.message, isHealthy: false });
      }
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [onStatusChange]);

  // Auto-refresh with configurable interval
  useEffect(() => {
    fetchAllData();

    if (refreshInterval > 0) {
      const interval = setInterval(fetchAllData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchAllData, refreshInterval]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAllData();
  };

  // Enhanced format functions
  const formatUptime = (seconds) => {
    if (!seconds || seconds < 0) return '0s';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}g ${hours}s`;
    if (hours > 0) return `${hours}s ${minutes}dk`;
    if (minutes > 0) return `${minutes}dk`;
    return `${seconds}s`;
  };

  const formatNumber = (num) => {
    if (!num || num < 0) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes < 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatRate = (rate) => {
    if (!rate || rate < 0) return '0/dk';
    if (rate >= 60) return `${(rate / 60).toFixed(1)}/s`;
    return `${rate.toFixed(1)}/dk`;
  };

  // Size variants
  const sizeClasses = {
    small: {
      container: 'px-2 py-1 text-xs',
      icon: 'text-xs',
      text: 'text-xs'
    },
    normal: {
      container: 'px-3 py-1.5 text-sm',
      icon: 'text-sm',
      text: 'text-xs'
    },
    large: {
      container: 'px-4 py-2 text-base',
      icon: 'text-base',
      text: 'text-sm'
    }
  };

  const currentSize = sizeClasses[size] || sizeClasses.normal;

  // Loading state
  if (isLoading) {
    return (
      <div className={`flex items-center space-x-2 rounded-full border bg-gray-500/20 border-gray-500/30 ${currentSize.container} ${className}`}>
        <FaDatabase className={`text-gray-400 ${currentSize.icon} animate-pulse`} />
        <span className={`text-gray-400 ${currentSize.text}`}>
          PC-to-PC durum kontrol ediliyor...
        </span>
      </div>
    );
  }

  // Error state
  if (error || !dataStatus?.persistence) {
    return (
      <div className={`flex items-center space-x-2 rounded-full border bg-red-500/20 border-red-500/30 ${currentSize.container} ${className}`}>
        <FaExclamationTriangle className={`text-red-400 ${currentSize.icon}`} />
        <span className={`text-red-400 ${currentSize.text}`}>
          Veri durumu alınamadı
        </span>
        {showDetails && (
          <button
            onClick={handleRefresh}
            className="text-red-400 hover:text-red-300 transition-colors"
            title="Yeniden dene"
          >
            <FaSync className={`text-xs ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>
    );
  }

  const { persistence } = dataStatus;

  // Enhanced status determination
  const getEnhancedStatusConfig = () => {
    const isPersistent = persistence.enabled && persistence.dataCollection;
    const hasData = persistence.totalActivities > 0;
    const isRealTimeActive = realTimeStats?.system_status === 'active';
    const hasRecentActivity = realTimeStats?.recent_logs_5min > 0;

    if (isPersistent && hasData && isRealTimeActive && hasRecentActivity) {
      return {
        icon: FaCheckCircle,
        color: 'text-green-400',
        bgColor: 'bg-green-500/20',
        borderColor: 'border-green-500/30',
        statusText: 'PC-to-PC Monitoring Aktif',
        statusColor: 'text-green-300',
        status: 'active',
        pulseColor: 'bg-green-400'
      };
    } else if (isPersistent && isRealTimeActive) {
      return {
        icon: FaWifi,
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/20',
        borderColor: 'border-blue-500/30',
        statusText: 'Trafik İzleme Hazır',
        statusColor: 'text-blue-300',
        status: 'ready',
        pulseColor: 'bg-blue-400'
      };
    } else if (isPersistent && !hasData) {
      return {
        icon: FaClock,
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-500/20',
        borderColor: 'border-yellow-500/30',
        statusText: 'Veri Bekleniyor',
        statusColor: 'text-yellow-300',
        status: 'waiting',
        pulseColor: 'bg-yellow-400'
      };
    } else {
      return {
        icon: FaExclamationTriangle,
        color: 'text-red-400',
        bgColor: 'bg-red-500/20',
        borderColor: 'border-red-500/30',
        statusText: 'Monitoring Devre Dışı',
        statusColor: 'text-red-300',
        status: 'inactive',
        pulseColor: 'bg-red-400'
      };
    }
  };

  const config = getEnhancedStatusConfig();
  const Icon = config.icon;

  // Get activity rate from real-time stats
  const activityRate = realTimeStats?.logs_per_minute || 0;
  const recentActivity = realTimeStats?.recent_logs_5min || 0;

  // Compact version for small size
  if (size === 'small') {
    return (
      <div
        className={`inline-flex items-center space-x-1 rounded-full border ${config.bgColor} ${config.borderColor} ${currentSize.container} ${className}`}
        title={`${config.statusText}: ${formatNumber(persistence.totalActivities)} kayıt`}
      >
        <div className="relative">
          <div className={`flex items-center space-x-1 ${config.color}`}>
            <Icon className={currentSize.icon} />
            <FaDatabase className={currentSize.icon} />
          </div>
          {config.status === 'active' && (
            <div className={`absolute -top-1 -right-1 w-2 h-2 ${config.pulseColor} rounded-full animate-pulse`} />
          )}
        </div>
        <span className={`font-medium ${config.statusColor} ${currentSize.text}`}>
          {formatNumber(persistence.totalActivities)}
        </span>
      </div>
    );
  }

  // Normal and large versions with enhanced features
  return (
    <div className={`relative ${className}`}>
      <div
        className={`flex items-center space-x-2 rounded-full border cursor-pointer transition-all duration-200 hover:shadow-lg ${config.bgColor} ${config.borderColor} ${currentSize.container} ${
          isExpanded ? 'rounded-lg shadow-lg' : ''
        }`}
        onClick={() => showDetails && setIsExpanded(!isExpanded)}
      >
        {/* Enhanced Status Icons */}
        <div className="relative">
          <div className={`flex items-center space-x-1 ${config.color}`}>
            <Icon className={currentSize.icon} />
            <FaDatabase className={currentSize.icon} />
          </div>

          {/* Activity pulse indicator */}
          {config.status === 'active' && (
            <div className={`absolute -top-1 -right-1 w-2 h-2 ${config.pulseColor} rounded-full animate-pulse`} />
          )}

          {/* Real-time activity indicator */}
          {recentActivity > 0 && (
            <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-blue-400 rounded-full animate-ping" />
          )}
        </div>

        {/* Enhanced Status Text */}
        <div className={currentSize.text}>
          <div className={`font-medium ${config.statusColor}`}>
            {config.statusText}
          </div>
          {showDetails && (
            <div className="text-gray-400">
              {formatNumber(persistence.totalActivities)} kayıt
              {activityRate > 0 && (
                <span className="ml-1">• {formatRate(activityRate)}</span>
              )}
              {persistence.systemUptime > 0 && (
                <span className="ml-1">• {formatUptime(persistence.systemUptime)}</span>
              )}
            </div>
          )}
        </div>

        {/* Enhanced Activity Badges */}
        <div className="flex items-center space-x-1">
          {persistence.totalActivities > 0 && (
            <div className="bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {formatNumber(persistence.totalActivities)}
            </div>
          )}

          {recentActivity > 0 && (
            <div className="bg-green-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full animate-bounce">
              +{recentActivity}
            </div>
          )}
        </div>

        {/* Last Update Indicator */}
        {lastUpdate && showDetails && (
          <div className="text-gray-500" title={`Son güncelleme: ${lastUpdate.toLocaleTimeString('tr-TR')}`}>
            <FaClock className="text-xs" />
          </div>
        )}

        {/* Refresh Button */}
        {showDetails && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRefresh();
            }}
            className={`${config.color} hover:text-white transition-colors`}
            title="Yenile"
          >
            <FaSync className={`text-xs ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        )}

        {/* Expand Indicator */}
        {showDetails && (
          <div className={`transition-transform duration-200 ${config.color} ${
            isExpanded ? 'rotate-180' : ''
          }`}>
            ▼
          </div>
        )}
      </div>

      {/* Enhanced Expanded Details Panel */}
      {isExpanded && showDetails && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800/95 backdrop-blur-xl border border-slate-700/50 rounded-lg p-4 shadow-xl z-50 min-w-[400px]">
          {/* Enhanced Header with Tabs */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <FaNetworkWired className="text-blue-400" />
              <h4 className="text-white font-medium">PC-to-PC Data Persistence</h4>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-gray-400 hover:text-white transition-colors text-xs"
                title="Gelişmiş görünüm"
              >
                <FaEye />
              </button>
              <button
                onClick={() => setIsExpanded(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <FaTimes className="text-sm" />
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex space-x-1 mb-4 bg-slate-700/30 rounded-lg p-1">
            {[
              { id: 'overview', label: 'Genel', icon: FaChartLine },
              { id: 'traffic', label: 'Trafik', icon: FaNetworkWired },
              { id: 'performance', label: 'Performans', icon: FaServer }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-1 px-3 py-1 rounded text-xs transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <tab.icon className="text-xs" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div>
              {/* Status Overview */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-slate-700/30 rounded-lg p-3">
                  <div className="text-gray-400 text-xs mb-1">Veri Toplama</div>
                  <div className={`text-sm font-medium ${
                    persistence.dataCollection ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {persistence.dataCollection ? 'Aktif' : 'Devre Dışı'}
                  </div>
                </div>
                <div className="bg-slate-700/30 rounded-lg p-3">
                  <div className="text-gray-400 text-xs mb-1">Real-time Status</div>
                  <div className={`text-sm font-medium ${
                    realTimeStats?.system_status === 'active' ? 'text-green-400' : 'text-yellow-400'
                  }`}>
                    {realTimeStats?.system_status === 'active' ? 'Canlı' : 'Beklemede'}
                  </div>
                </div>
              </div>

              {/* Key Statistics */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-slate-700/30 rounded-lg p-3">
                  <div className="flex items-center space-x-2 mb-1">
                    <FaChartLine className="text-blue-400 text-xs" />
                    <div className="text-gray-400 text-xs">Toplam Log Kayıtları</div>
                  </div>
                  <div className="text-white text-lg font-bold">
                    {formatNumber(persistence.totalActivities)}
                  </div>
                  {realTimeStats?.recent_logs_5min > 0 && (
                    <div className="text-green-400 text-xs">
                      +{realTimeStats.recent_logs_5min} son 5dk
                    </div>
                  )}
                </div>
                <div className="bg-slate-700/30 rounded-lg p-3">
                  <div className="flex items-center space-x-2 mb-1">
                    <FaClock className="text-green-400 text-xs" />
                    <div className="text-gray-400 text-xs">Sistem Uptime</div>
                  </div>
                  <div className="text-white text-lg font-bold">
                    {formatUptime(persistence.systemUptime)}
                  </div>
                  <div className="text-gray-500 text-xs">
                    sürekli çalışma
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'traffic' && trafficSummary && (
            <div>
              {/* Traffic Statistics */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-slate-700/30 rounded-lg p-3">
                  <div className="flex items-center space-x-2 mb-1">
                    <FaNetworkWired className="text-blue-400 text-xs" />
                    <div className="text-gray-400 text-xs">Toplam Bağlantı</div>
                  </div>
                  <div className="text-white text-lg font-bold">
                    {formatNumber(trafficSummary.summary?.total_flows || 0)}
                  </div>
                </div>
                <div className="bg-slate-700/30 rounded-lg p-3">
                  <div className="flex items-center space-x-2 mb-1">
                    <FaBolt className="text-yellow-400 text-xs" />
                    <div className="text-gray-400 text-xs">Aktif Bağlantı</div>
                  </div>
                  <div className="text-white text-lg font-bold">
                    {formatNumber(realTimeStats?.active_connections || 0)}
                  </div>
                </div>
              </div>

              {/* Traffic Breakdown */}
              <div className="mb-4">
                <div className="text-gray-400 text-xs mb-2">Trafik Dağılımı</div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-green-500/10 border border-green-500/20 rounded p-2">
                    <div className="text-green-400 text-xs">İç Ağ Trafiği</div>
                    <div className="text-white font-medium">
                      {formatNumber(trafficSummary.summary?.internal_flows || 0)}
                    </div>
                  </div>
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded p-2">
                    <div className="text-blue-400 text-xs">Dış Ağ Trafiği</div>
                    <div className="text-white font-medium">
                      {formatNumber(trafficSummary.summary?.external_flows || 0)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bandwidth Info */}
              <div className="mb-4">
                <div className="text-gray-400 text-xs mb-2">Veri Transfer</div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Toplam Bytes:</span>
                  <span className="text-white">
                    {formatBytes(trafficSummary.summary?.total_bytes || 0)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Toplam Paket:</span>
                  <span className="text-white">
                    {formatNumber(trafficSummary.summary?.total_packets || 0)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'performance' && (
            <div>
              {/* Performance Metrics */}
              <div className="mb-4">
                <div className="text-gray-400 text-xs mb-2">Performans Metrikleri</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Log Rate:</span>
                    <span className="text-white">{formatRate(activityRate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Toplam Paket:</span>
                    <span className="text-white">{formatNumber(realTimeStats?.total_packets || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Veri Transfer:</span>
                    <span className="text-white">{formatBytes(realTimeStats?.bytes_transferred || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Unique IPs:</span>
                    <span className="text-white">{realTimeStats?.unique_ips_count || 0}</span>
                  </div>
                </div>
              </div>

              {/* Performance History Chart (simplified) */}
              {showAdvanced && performanceHistory.length > 0 && (
                <div className="mb-4">
                  <div className="text-gray-400 text-xs mb-2">Aktivite Geçmişi (Son 20 Kayıt)</div>
                  <div className="bg-slate-700/20 rounded p-2 h-20 flex items-end space-x-1">
                    {performanceHistory.map((entry, index) => {
                      const height = Math.max(4, (entry.logsPerMinute / Math.max(...performanceHistory.map(e => e.logsPerMinute))) * 60);
                      return (
                        <div
                          key={index}
                          className="bg-blue-400 w-2 rounded-t"
                          style={{ height: `${height}px` }}
                          title={`${entry.logsPerMinute.toFixed(1)} logs/min at ${entry.timestamp.toLocaleTimeString()}`}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Database Performance */}
              {persistence.performanceMetrics && (
                <div className="mb-4">
                  <div className="text-gray-400 text-xs mb-2 flex items-center space-x-1">
                    <FaDatabase className="text-xs" />
                    <span>Database Durumu</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Veri Boyutu:</span>
                      <span className="text-white">
                        {formatBytes(persistence.performanceMetrics.dataSize || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Disk Kullanımı:</span>
                      <span className="text-white">
                        {persistence.performanceMetrics.diskUsage || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Retention:</span>
                      <span className="text-white">
                        {persistence.performanceMetrics.retentionDays || 30} gün
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Son Backup:</span>
                      <span className="text-white">
                        {persistence.performanceMetrics.lastBackup || 'Yok'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Health Status */}
          <div className="mb-4">
            <div className="text-gray-400 text-xs mb-2">Sistem Sağlığı</div>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${
                config.status === 'active' ? 'bg-green-400 animate-pulse' :
                config.status === 'ready' ? 'bg-blue-400' :
                config.status === 'waiting' ? 'bg-yellow-400' :
                'bg-red-400'
              }`} />
              <span className="text-white text-sm font-medium">
                {config.status === 'active' ? 'PC-to-PC Monitoring Aktif' :
                 config.status === 'ready' ? 'Sistem Hazır' :
                 config.status === 'waiting' ? 'Trafik Bekleniyor' :
                 'Dikkat Gerekli'}
              </span>
            </div>
          </div>

          {/* Last Update Info */}
          {lastUpdate && (
            <div className="mb-4">
              <div className="text-gray-400 text-xs mb-1">Son Güncelleme</div>
              <div className="flex items-center space-x-2 text-xs">
                <FaClock className="text-gray-400" />
                <span className="text-white">
                  {lastUpdate.toLocaleString('tr-TR')}
                </span>
                <span className="text-gray-400">
                  ({formatUptime((Date.now() - lastUpdate.getTime()) / 1000)} önce)
                </span>
              </div>
            </div>
          )}

          {/* Enhanced Quick Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs px-3 py-1 rounded transition-colors flex items-center space-x-1"
              >
                <FaSync className={`text-xs ${refreshing ? 'animate-spin' : ''}`} />
                <span>Yenile</span>
              </button>

              {!persistence.enabled && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded px-2 py-1">
                  <div className="flex items-center space-x-1">
                    <FaInfoCircle className="text-yellow-400 text-xs" />
                    <span className="text-yellow-200 text-xs">Veri toplama kapalı</span>
                  </div>
                </div>
              )}

              {config.status === 'active' && (
                <div className="bg-green-500/10 border border-green-500/30 rounded px-2 py-1">
                  <div className="flex items-center space-x-1">
                    <FaShieldAlt className="text-green-400 text-xs" />
                    <span className="text-green-200 text-xs">Monitoring aktif</span>
                  </div>
                </div>
              )}
            </div>

            <div className="text-xs text-gray-500">
              Auto-refresh: {refreshInterval / 1000}s
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataPersistenceIndicator;