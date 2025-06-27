import React, { useState, useEffect, useCallback } from 'react';
import {
  FaWifi,
  FaExclamationTriangle,
  FaTimes,
  FaSync,
  FaCircle,
  FaSignal,        // FaSignalAlt yerine FaSignal
  FaClock,
  FaPlug,
  FaServer,
  FaShieldAlt,
  FaBolt,
  FaEye,
  FaDatabase
} from 'react-icons/fa';
import { webSocketService } from '../services/websocketService';

const RealTimeIndicator = ({
  className = '',
  showDetails = true,
  size = 'normal',
  onStatusChange = null,
  autoConnect = true,
  showMetrics = true
}) => {
  // Enhanced connection state
  const [connectionStatus, setConnectionStatus] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState('disconnected');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [totalReconnects, setTotalReconnects] = useState(0);
  // Enhanced activity tracking
  const [error, setError] = useState(null);
  const [lastActivity, setLastActivity] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [isInitializing, setIsInitializing] = useState(false);
  // Message counters for different types
  const [messageCounts, setMessageCounts] = useState({
    logs: 0,
    stats: 0,
    alerts: 0,
    total: 0
  });
  // UI state
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  // Activity indicators
  const [recentActivity, setRecentActivity] = useState({
    logs: 0,
    stats: 0,
    alerts: 0
  });

  // Reset recent activity counters every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setRecentActivity({ logs: 0, stats: 0, alerts: 0 });
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Enhanced connection handler
  const handleConnectionChange = useCallback((connected, quality, connectionMetrics) => {
    setConnectionStatus(connected);
    setConnectionQuality(quality);
    setMetrics(connectionMetrics);
    setIsInitializing(false);
    if (connected) {
      setError(null);
      setLastActivity(new Date());
    }
    // Notify parent component if callback provided
    if (onStatusChange) {
      onStatusChange({
        connected,
        quality,
        metrics: connectionMetrics,
        error: connected ? null : error
      });
    }
  }, [error, onStatusChange]);

  // Enhanced error handler
  const handleError = useCallback((errorMsg) => {
    setError(errorMsg);
    setLastActivity(new Date());
    setIsInitializing(false);
    if (onStatusChange) {
      onStatusChange({
        connected: false,
        quality: 'disconnected',
        error: errorMsg
      });
    }
  }, [onStatusChange]);

  // Enhanced reconnect handler
  const handleReconnect = useCallback((attempts, totalCount) => {
    setReconnectAttempts(attempts);
    setTotalReconnects(totalCount);
    setLastActivity(new Date());
    setIsInitializing(true);
  }, []);

  // Enhanced message handlers
  const handleNewLog = useCallback((logData) => {
    setMessageCounts(prev => ({
      ...prev,
      logs: prev.logs + 1,
      total: prev.total + 1
    }));
    setRecentActivity(prev => ({ ...prev, logs: prev.logs + 1 }));
    setLastActivity(new Date());
  }, []);

  const handleStatsUpdate = useCallback((statsData) => {
    setMessageCounts(prev => ({
      ...prev,
      stats: prev.stats + 1,
      total: prev.total + 1
    }));
    setRecentActivity(prev => ({ ...prev, stats: prev.stats + 1 }));
    setLastActivity(new Date());
  }, []);

  const handleSecurityAlert = useCallback((alertData) => {
    setMessageCounts(prev => ({
      ...prev,
      alerts: prev.alerts + 1,
      total: prev.total + 1
    }));
    setRecentActivity(prev => ({ ...prev, alerts: prev.alerts + 1 }));
    setLastActivity(new Date());
  }, []);

  useEffect(() => {
    // Initialize WebSocket if auto-connect is enabled
    if (autoConnect && webSocketService?.isHealthy) {
      try {
        if (!webSocketService.isHealthy()) {
          setIsInitializing(true);
          webSocketService.connect();
        }
      } catch (err) {
        console.warn('WebSocket service not ready:', err);
      }
    }

    // Set up event listeners with error handling
    let unsubscribeConnection = () => {};
    let unsubscribeError = () => {};
    let unsubscribeReconnect = () => {};
    let unsubscribeNewLog = () => {};
    let unsubscribeStatsUpdate = () => {};
    let unsubscribeSecurityAlert = () => {};

    try {
      unsubscribeConnection = webSocketService.onConnectionChange?.(handleConnectionChange) || (() => {});
      unsubscribeError = webSocketService.onError?.(handleError) || (() => {});
      unsubscribeReconnect = webSocketService.onReconnect?.(handleReconnect) || (() => {});
      unsubscribeNewLog = webSocketService.onNewLog?.(handleNewLog) || (() => {});
      unsubscribeStatsUpdate = webSocketService.onStatsUpdate?.(handleStatsUpdate) || (() => {});
      unsubscribeSecurityAlert = webSocketService.onSecurityAlert?.(handleSecurityAlert) || (() => {});

      // Get initial status
      const status = webSocketService.getStatus?.() || {};
      setConnectionStatus(status.isConnected || false);
      setConnectionQuality(status.connectionQuality || 'disconnected');
      setReconnectAttempts(status.reconnectAttempts || 0);

      // Get initial metrics
      const initialMetrics = webSocketService.getConnectionMetrics?.() || null;
      setMetrics(initialMetrics);
    } catch (err) {
      console.warn('Error setting up WebSocket listeners:', err);
    }

    // Cleanup function
    return () => {
      try {
        unsubscribeConnection();
        unsubscribeError();
        unsubscribeReconnect();
        unsubscribeNewLog();
        unsubscribeStatsUpdate();
        unsubscribeSecurityAlert();
      } catch (err) {
        console.warn('Error cleaning up WebSocket listeners:', err);
      }
    };
  }, [autoConnect, handleConnectionChange, handleError, handleReconnect,
      handleNewLog, handleStatsUpdate, handleSecurityAlert]);

  // Enhanced status configuration
  const getStatusConfig = () => {
    if (isInitializing) {
      return {
        icon: FaSync,
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/30',
        pulseColor: 'bg-blue-400',
        text: 'Başlatılıyor',
        description: 'Bağlantı kuruluyor...',
        status: 'initializing'
      };
    }
    if (connectionStatus && connectionQuality === 'good') {
      return {
        icon: FaWifi,
        color: 'text-green-400',
        bgColor: 'bg-green-500/10',
        borderColor: 'border-green-500/30',
        pulseColor: 'bg-green-400',
        text: 'Canlı Bağlantı',
        description: 'PC-to-PC traffic monitoring aktif',
        status: 'healthy'
      };
    } else if (connectionStatus && connectionQuality === 'poor') {
      return {
        icon: FaExclamationTriangle,
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-500/10',
        borderColor: 'border-yellow-500/30',
        pulseColor: 'bg-yellow-400',
        text: 'Zayıf Bağlantı',
        description: 'Log güncellemeleri gecikebilir',
        status: 'warning'
      };
    } else if (reconnectAttempts > 0) {
      return {
        icon: FaSync,
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/30',
        pulseColor: 'bg-blue-400',
        text: 'Yeniden Bağlanıyor',
        description: `Deneme ${reconnectAttempts}/10`,
        status: 'connecting'
      };
    } else {
      return {
        icon: FaTimes,
        color: 'text-red-400',
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500/30',
        pulseColor: 'bg-red-400',
        text: 'Bağlantı Yok',
        description: 'Real-time log izleme devre dışı',
        status: 'disconnected'
      };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

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

  // Enhanced utility functions
  const formatUptime = (uptimeMs) => {
    if (!uptimeMs || uptimeMs < 0) return '0s';
    const seconds = Math.floor(uptimeMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}g ${hours % 24}s`;
    if (hours > 0) return `${hours}s ${minutes % 60}dk`;
    if (minutes > 0) return `${minutes}dk ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const formatCount = (count) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  // Enhanced action handlers
  const handleManualReconnect = () => {
    setError(null);
    setIsInitializing(true);
    try {
      webSocketService.disconnect?.();
      setTimeout(() => webSocketService.connect?.(), 1000);
    } catch (err) {
      console.warn('Error during manual reconnect:', err);
      setIsInitializing(false);
    }
  };

  const handleResetCounters = () => {
    setMessageCounts({ logs: 0, stats: 0, alerts: 0, total: 0 });
    setRecentActivity({ logs: 0, stats: 0, alerts: 0 });
  };

  const handleRequestData = () => {
    try {
      webSocketService.requestData?.(['logs', 'stats', 'alerts']);
    } catch (err) {
      console.warn('Error requesting data:', err);
    }
  };

  // Compact version for small size
  if (size === 'small') {
    return (
      <div
        className={`inline-flex items-center space-x-1 rounded-full border ${config.bgColor} ${config.borderColor} ${currentSize.container} ${className}`}
        title={`${config.text}: ${config.description}`}
      >
        <div className="relative">
          <Icon className={`${config.color} ${currentSize.icon} ${
            isInitializing || reconnectAttempts > 0 ? 'animate-spin' :
            connectionStatus ? 'animate-pulse' : ''
          }`} />
          {connectionStatus && (
            <div className={`absolute -top-1 -right-1 w-2 h-2 ${config.pulseColor} rounded-full animate-pulse`} />
          )}
        </div>
        <span className={`font-medium ${config.color} ${currentSize.text}`}>
          {config.status === 'connecting' ? reconnectAttempts :
           messageCounts.total > 0 ? formatCount(messageCounts.total) : ''}
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
        {/* Enhanced Status Icon with Multiple Indicators */}
        <div className="relative flex items-center">
          <Icon className={`${config.color} ${currentSize.icon} ${
            isInitializing || reconnectAttempts > 0 ? 'animate-spin' :
            connectionStatus ? 'animate-pulse' : ''
          }`} />
          {/* Connection quality indicator */}
          {connectionStatus && (
            <div className={`absolute -top-1 -right-1 w-2 h-2 ${config.pulseColor} rounded-full ${
              connectionQuality === 'good' ? 'animate-pulse' :
              connectionQuality === 'poor' ? 'animate-bounce' : ''
            }`} />
          )}
          {/* Activity indicator for recent messages */}
          {(recentActivity.logs > 0 || recentActivity.stats > 0 || recentActivity.alerts > 0) && (
            <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-blue-400 rounded-full animate-ping" />
          )}
        </div>

        {/* Enhanced Status Text */}
        <div className={currentSize.text}>
          <span className={`font-medium ${config.color}`}>
            {config.text}
          </span>
          {showDetails && (
            <div className="text-gray-400">
              {config.description}
            </div>
          )}
        </div>

        {/* Enhanced Message Count Badges */}
        {messageCounts.total > 0 && connectionStatus && (
          <div className="flex items-center space-x-1">
            {messageCounts.logs > 0 && (
              <div className="bg-green-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full" title="Log mesajları">
                {formatCount(messageCounts.logs)}
              </div>
            )}
            {messageCounts.alerts > 0 && (
              <div className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full" title="Güvenlik uyarıları">
                {formatCount(messageCounts.alerts)}
              </div>
            )}
            {messageCounts.stats > 0 && (
              <div className="bg-blue-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full" title="İstatistik güncellemeleri">
                {formatCount(messageCounts.stats)}
              </div>
            )}
          </div>
        )}

        {/* Error Indicator */}
        {error && (
          <div className="text-red-400" title={error}>
            <FaExclamationTriangle className="text-xs animate-bounce" />
          </div>
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
        <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800/95 backdrop-blur-xl border border-slate-700/50 rounded-lg p-4 shadow-xl z-50 min-w-[350px]">
          {/* Enhanced Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <FaServer className="text-blue-400" />
              <h4 className="text-white font-medium">Real-time Log Monitoring</h4>
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

          {/* Enhanced Connection Status Grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-slate-700/30 rounded-lg p-2">
              <div className="text-gray-400 text-xs flex items-center space-x-1">
                <FaWifi className="text-xs" />
                <span>Bağlantı Durumu</span>
              </div>
              <div className={`text-sm font-medium ${config.color}`}>
                {config.text}
              </div>
            </div>
            <div className="bg-slate-700/30 rounded-lg p-2">
              <div className="text-gray-400 text-xs flex items-center space-x-1">
                <FaSignal className="text-xs" />
                <span>Bağlantı Kalitesi</span>
              </div>
              <div className="text-white text-sm font-medium">
                {connectionQuality === 'good' ? '🟢 Mükemmel' :
                 connectionQuality === 'poor' ? '🟡 Zayıf' :
                 '🔴 Bağlantısız'}
              </div>
            </div>
            <div className="bg-slate-700/30 rounded-lg p-2">
              <div className="text-gray-400 text-xs flex items-center space-x-1">
                <FaBolt className="text-xs" />
                <span>Toplam Mesaj</span>
              </div>
              <div className="text-white text-sm font-medium">
                {messageCounts.total.toLocaleString()}
              </div>
            </div>
            <div className="bg-slate-700/30 rounded-lg p-2">
              <div className="text-gray-400 text-xs flex items-center space-x-1">
                <FaSync className="text-xs" />
                <span>Yeniden Bağlanma</span>
              </div>
              <div className="text-white text-sm font-medium">
                {totalReconnects} kez
              </div>
            </div>
          </div>

          {/* Enhanced Message Type Breakdown */}
          <div className="mb-4">
            <div className="text-gray-400 text-xs mb-2 flex items-center space-x-1">
              <FaDatabase className="text-xs" />
              <span>Mesaj Türleri</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-green-500/10 border border-green-500/20 rounded p-2">
                <div className="text-green-400 text-xs">Log Kayıtları</div>
                <div className="text-white font-medium">{messageCounts.logs.toLocaleString()}</div>
                {recentActivity.logs > 0 && (
                  <div className="text-green-300 text-xs">+{recentActivity.logs} son 30s</div>
                )}
              </div>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded p-2">
                <div className="text-blue-400 text-xs">İstatistikler</div>
                <div className="text-white font-medium">{messageCounts.stats.toLocaleString()}</div>
                {recentActivity.stats > 0 && (
                  <div className="text-blue-300 text-xs">+{recentActivity.stats} son 30s</div>
                )}
              </div>
              <div className="bg-red-500/10 border border-red-500/20 rounded p-2">
                <div className="text-red-400 text-xs">Güvenlik Uyarıları</div>
                <div className="text-white font-medium">{messageCounts.alerts.toLocaleString()}</div>
                {recentActivity.alerts > 0 && (
                  <div className="text-red-300 text-xs">+{recentActivity.alerts} son 30s</div>
                )}
              </div>
            </div>
          </div>

          {/* Enhanced Metrics - Show only if enabled */}
          {showMetrics && metrics && (
            <div className="mb-4">
              <div className="text-gray-400 text-xs mb-2">Performans Metrikleri</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Çalışma Süresi:</span>
                  <span className="text-white">{formatUptime(metrics.uptime)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Gönderilen:</span>
                  <span className="text-white">{metrics.messagesSent || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Alınan:</span>
                  <span className="text-white">{metrics.messagesReceived || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Kuyruk:</span>
                  <span className="text-white">{webSocketService.getStatus?.()?.queuedMessages || 0}</span>
                </div>
                {showAdvanced && (
                  <>
                    <div className="flex justify-between col-span-2">
                      <span className="text-gray-400">WebSocket Durumu:</span>
                      <span className="text-white">{webSocketService.getReadyState?.() || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between col-span-2">
                      <span className="text-gray-400">Endpoint:</span>
                      <span className="text-white text-xs truncate">{webSocketService.getStatus?.()?.endpoint || 'N/A'}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Last Activity */}
          {lastActivity && (
            <div className="mb-4">
              <div className="text-gray-400 text-xs mb-1">Son Aktivite</div>
              <div className="flex items-center space-x-2 text-xs">
                <FaClock className="text-gray-400" />
                <span className="text-white">{lastActivity.toLocaleString('tr-TR')}</span>
                <span className="text-gray-400">({formatUptime(Date.now() - lastActivity.getTime())} önce)</span>
              </div>
            </div>
          )}

          {/* Enhanced Error Display */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
              <div className="flex items-center space-x-2">
                <FaExclamationTriangle className="text-red-400 text-sm" />
                <span className="text-red-200 text-sm font-medium">Bağlantı Hatası</span>
              </div>
              <div className="text-red-200/80 text-xs mt-1">{error}</div>
            </div>
          )}

          {/* Enhanced Quick Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button
                onClick={handleManualReconnect}
                disabled={isInitializing}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white text-xs px-3 py-1 rounded transition-colors flex items-center space-x-1"
              >
                <FaSync className={isInitializing ? 'animate-spin' : ''} />
                <span>{isInitializing ? 'Bağlanıyor...' : 'Yeniden Bağlan'}</span>
              </button>
              <button
                onClick={handleResetCounters}
                className="bg-gray-600 hover:bg-gray-700 text-white text-xs px-3 py-1 rounded transition-colors"
              >
                Sayaçları Sıfırla
              </button>
              {connectionStatus && (
                <button
                  onClick={handleRequestData}
                  className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1 rounded transition-colors"
                  title="Sunucudan veri talep et"
                >
                  Veri Talep Et
                </button>
              )}
            </div>
            <div className="text-xs text-gray-500">
              Log Monitor v2.0
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RealTimeIndicator;