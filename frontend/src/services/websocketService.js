/**
 * Enhanced WebSocket Service for Real-time Log Updates
 * KOBI Firewall - PC-to-PC Internet Sharing Traffic Monitoring
 * Compatible with enhanced backend log system
 */

class RobustWebSocketService {
  constructor() {
    this.ws = null;
    this.callbacks = {
      onNewLog: [],
      onStatsUpdate: [],
      onConnectionChange: [],
      onError: [],
      onReconnect: [],
      onMonitoringStatusChange: [],
      onSecurityAlert: [],          // NEW: Security alerts
      onTrafficSummary: [],         // NEW: Traffic summary updates
      onRealTimeStats: []           // NEW: Real-time statistics
    };

    // Connection management
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectInterval = 3000;
    this.heartbeatInterval = 30000;
    this.heartbeatTimer = null;
    this.reconnectTimer = null;

    // Message queue for offline mode
    this.messageQueue = [];
    this.maxQueueSize = 1000;

    // Connection quality tracking
    this.lastPingTime = null;
    this.connectionQuality = 'disconnected'; // good, poor, disconnected
    this.connectionMetrics = {
      connectTime: null,
      disconnectTime: null,
      messagesReceived: 0,
      messagesSent: 0,
      reconnectCount: 0,
      logMessagesReceived: 0,      // NEW: Log-specific metrics
      statsUpdatesReceived: 0,     // NEW: Stats-specific metrics
      alertsReceived: 0            // NEW: Alert-specific metrics
    };

    // Enhanced logging for debugging
    this.debug = process.env.NODE_ENV === 'development';

    // Bind methods
    this.connect = this.connect.bind(this);
    this.disconnect = this.disconnect.bind(this);
    this.handleOpen = this.handleOpen.bind(this);
    this.handleMessage = this.handleMessage.bind(this);
    this.handleClose = this.handleClose.bind(this);
    this.handleError = this.handleError.bind(this);
  }

  // ===========================================
  // CONNECTION MANAGEMENT (Enhanced)
  // ===========================================

  connect() {
    try {
      // Prevent multiple connections
      if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
        this.log('🔌 WebSocket already connected or connecting');
        return;
      }

      // Clean up existing connection
      this.cleanup();

      // Determine WebSocket URL - Updated for backend compatibility
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;

      // Try multiple WebSocket endpoints for compatibility
      const wsEndpoints = [
        `${protocol}//${host}/api/v1/logs/ws`,          // Primary endpoint
        `${protocol}//${host}/api/v1/logs/realtime`,    // Alternative
        `${protocol}//${host}/ws/logs`,                 // Fallback
        `${protocol}//${host}/websocket/logs`           // Legacy
      ];

      this.connectWithEndpoints(wsEndpoints, 0);

    } catch (error) {
      console.error('❌ WebSocket connection error:', error);
      this.handleConnectionError(error);
    }
  }

  async connectWithEndpoints(endpoints, index) {
    if (index >= endpoints.length) {
      this.handleConnectionError(new Error('All WebSocket endpoints failed'));
      return;
    }

    const wsUrl = endpoints[index];
    this.log('🔌 WebSocket attempting connection to:', wsUrl);

    try {
      // Create new WebSocket connection with timeout
      this.ws = new WebSocket(wsUrl);

      // Set connection timeout
      const connectionTimeout = setTimeout(() => {
        if (this.ws.readyState === WebSocket.CONNECTING) {
          this.log('⏰ WebSocket connection timeout, trying next endpoint');
          this.ws.close();
          this.connectWithEndpoints(endpoints, index + 1);
        }
      }, 5000);

      // Set up event handlers
      this.ws.onopen = () => {
        clearTimeout(connectionTimeout);
        this.handleOpen();
      };

      this.ws.onmessage = this.handleMessage;
      this.ws.onclose = (event) => {
        clearTimeout(connectionTimeout);
        // If this was a connection failure, try next endpoint
        if (!this.isConnected && index < endpoints.length - 1) {
          this.connectWithEndpoints(endpoints, index + 1);
        } else {
          this.handleClose(event);
        }
      };

      this.ws.onerror = (error) => {
        clearTimeout(connectionTimeout);
        this.log('❌ WebSocket error on endpoint:', wsUrl, error);
        // Try next endpoint on error
        if (index < endpoints.length - 1) {
          this.connectWithEndpoints(endpoints, index + 1);
        } else {
          this.handleError(error);
        }
      };

      // Set connection start time
      this.connectionMetrics.connectTime = new Date();

    } catch (error) {
      this.log('❌ Failed to create WebSocket for:', wsUrl, error);
      this.connectWithEndpoints(endpoints, index + 1);
    }
  }

  disconnect() {
    try {
      this.log('🔌 WebSocket disconnecting...');

      // Stop reconnection attempts
      this.stopReconnection();

      // Stop heartbeat
      this.stopHeartbeat();

      // Close WebSocket connection
      if (this.ws) {
        this.ws.onclose = null; // Prevent reconnection
        this.ws.close(1000, 'User initiated disconnect');
        this.ws = null;
      }

      // Update state
      this.isConnected = false;
      this.connectionQuality = 'disconnected';
      this.connectionMetrics.disconnectTime = new Date();

      // Notify listeners
      this.notifyConnectionChange(false);
      this.log('✅ WebSocket disconnected');

    } catch (error) {
      console.error('❌ WebSocket disconnect error:', error);
    }
  }

  cleanup() {
    this.stopHeartbeat();
    this.stopReconnection();
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws = null;
    }
  }

  // ===========================================
  // ENHANCED EVENT HANDLERS
  // ===========================================

  handleOpen() {
    this.log('✅ WebSocket connection established');

    // Update connection state
    this.isConnected = true;
    this.reconnectAttempts = 0;
    this.connectionQuality = 'good';
    this.lastPingTime = Date.now();
    this.connectionMetrics.messagesReceived = 0;
    this.connectionMetrics.messagesSent = 0;

    // Start heartbeat
    this.startHeartbeat();

    // Send authentication/initialization if needed
    this.initializeConnection();

    // Flush message queue
    this.flushMessageQueue();

    // Notify listeners
    this.notifyConnectionChange(true);
    this.notifyReconnect();

    // Log metrics
    this.log('📊 WebSocket connection metrics:', this.connectionMetrics);
  }

  handleMessage(event) {
    try {
      const data = JSON.parse(event.data);
      this.connectionMetrics.messagesReceived++;

      // Update connection quality
      this.updateConnectionQuality();

      // Enhanced message handling for log system
      switch (data.type) {
        case 'new_log':
        case 'log_entry':
          this.connectionMetrics.logMessagesReceived++;
          this.notifyNewLog(this.enhanceLogData(data.data || data.payload));
          break;

        case 'stats_update':
        case 'log_statistics':
          this.connectionMetrics.statsUpdatesReceived++;
          this.notifyStatsUpdate(data.data || data.payload);
          break;

        case 'real_time_stats':
          this.notifyRealTimeStats(data.data || data.payload);
          break;

        case 'security_alert':
        case 'alert':
          this.connectionMetrics.alertsReceived++;
          this.notifySecurityAlert(data.data || data.payload);
          break;

        case 'traffic_summary':
          this.notifyTrafficSummary(data.data || data.payload);
          break;

        case 'monitoring_status_change':
        case 'status_change':
          this.notifyMonitoringStatusChange(data.data || data.payload);
          break;

        case 'ping':
          this.send({ type: 'pong', timestamp: new Date().toISOString() });
          break;

        case 'pong':
          this.lastPingTime = Date.now();
          break;

        case 'error':
          console.error('❌ WebSocket server error:', data.error || data.message);
          this.notifyError(data.error || data.message);
          break;

        case 'welcome':
        case 'connected':
          this.log('🎉 WebSocket welcome message:', data.message);
          break;

        case 'batch_logs':
          // Handle batch log updates
          if (Array.isArray(data.data)) {
            data.data.forEach(log => this.notifyNewLog(this.enhanceLogData(log)));
          }
          break;

        default:
          this.log('🔌 WebSocket unknown message type:', data.type, data);
      }

    } catch (error) {
      console.error('❌ WebSocket message parse error:', error, event.data);
      this.notifyError('Mesaj parse hatası');
    }
  }

  handleClose(event) {
    this.log('🔌 WebSocket connection closed:', event.code, event.reason);

    // Update state
    this.isConnected = false;
    this.connectionMetrics.disconnectTime = new Date();

    // Stop heartbeat
    this.stopHeartbeat();

    // Notify listeners
    this.notifyConnectionChange(false);

    // Handle different close codes
    if (event.code === 1000 || event.code === 1001) {
      // Clean close - don't reconnect
      this.connectionQuality = 'disconnected';
      this.log('✅ WebSocket clean close');
    } else {
      // Unexpected close - attempt reconnection
      this.connectionQuality = 'poor';
      this.log('⚠️ WebSocket unexpected close, will attempt reconnection');
      this.scheduleReconnection();
    }
  }

  handleError(error) {
    console.error('❌ WebSocket error:', error);
    this.connectionQuality = 'poor';
    this.notifyError('WebSocket bağlantı hatası');
  }

  handleConnectionError(error) {
    this.isConnected = false;
    this.connectionQuality = 'disconnected';
    this.notifyConnectionChange(false);
    this.notifyError(error.message || 'Bağlantı hatası');
    this.scheduleReconnection();
  }

  // ===========================================
  // NEW: CONNECTION INITIALIZATION
  // ===========================================

  initializeConnection() {
    try {
      // Send client information and preferences
      const initMessage = {
        type: 'init',
        client: 'kobi-firewall-frontend',
        version: '2.0.0',
        capabilities: ['logs', 'stats', 'alerts', 'real_time'],
        preferences: {
          log_levels: ['ALLOW', 'BLOCK', 'DENY', 'WARNING', 'ERROR'],
          real_time_updates: true,
          batch_size: 10
        },
        timestamp: new Date().toISOString()
      };

      this.send(initMessage);
      this.log('📤 Sent initialization message');

    } catch (error) {
      console.error('❌ Failed to initialize WebSocket connection:', error);
    }
  }

  // ===========================================
  // ENHANCED DATA PROCESSING
  // ===========================================

  enhanceLogData(logData) {
    if (!logData) return logData;

    try {
      // Add frontend-specific enhancements
      const enhanced = {
        ...logData,
        receivedAt: new Date().toISOString(),
        isRealTime: true
      };

      // Add Turkish time formatting if not present
      if (enhanced.timestamp && !enhanced.formatted_time) {
        enhanced.formatted_time = new Date(enhanced.timestamp).toLocaleString('tr-TR');
      }

      // Add time ago if not present
      if (enhanced.timestamp && !enhanced.time_ago) {
        const diff = Date.now() - new Date(enhanced.timestamp).getTime();
        enhanced.time_ago = this.formatTimeAgo(diff);
      }

      // Add action badge if not present
      if (enhanced.level && !enhanced.action_badge) {
        enhanced.action_badge = this.getActionBadge(enhanced.level);
      }

      return enhanced;

    } catch (error) {
      console.error('❌ Error enhancing log data:', error);
      return logData;
    }
  }

  formatTimeAgo(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} gün önce`;
    if (hours > 0) return `${hours} saat önce`;
    if (minutes > 0) return `${minutes} dakika önce`;
    return 'Az önce';
  }

  getActionBadge(level) {
    const badges = {
      'ALLOW': { color: 'success', text: 'İzin', icon: 'check' },
      'BLOCK': { color: 'danger', text: 'Engel', icon: 'block' },
      'DENY': { color: 'danger', text: 'Red', icon: 'x' },
      'WARNING': { color: 'warning', text: 'Uyarı', icon: 'alert-triangle' },
      'ERROR': { color: 'danger', text: 'Hata', icon: 'alert-circle' },
      'CRITICAL': { color: 'danger', text: 'Kritik', icon: 'alert-octagon' },
      'INFO': { color: 'info', text: 'Bilgi', icon: 'info' }
    };

    return badges[level] || badges['INFO'];
  }

  // ===========================================
  // ENHANCED CALLBACK MANAGEMENT
  // ===========================================

  onNewLog(callback) {
    this.callbacks.onNewLog.push(callback);
    return () => this.removeCallback('onNewLog', callback);
  }

  onStatsUpdate(callback) {
    this.callbacks.onStatsUpdate.push(callback);
    return () => this.removeCallback('onStatsUpdate', callback);
  }

  onRealTimeStats(callback) {
    this.callbacks.onRealTimeStats.push(callback);
    return () => this.removeCallback('onRealTimeStats', callback);
  }

  onSecurityAlert(callback) {
    this.callbacks.onSecurityAlert.push(callback);
    return () => this.removeCallback('onSecurityAlert', callback);
  }

  onTrafficSummary(callback) {
    this.callbacks.onTrafficSummary.push(callback);
    return () => this.removeCallback('onTrafficSummary', callback);
  }

  onMonitoringStatusChange(callback) {
    this.callbacks.onMonitoringStatusChange.push(callback);
    return () => this.removeCallback('onMonitoringStatusChange', callback);
  }

  onConnectionChange(callback) {
    this.callbacks.onConnectionChange.push(callback);
    return () => this.removeCallback('onConnectionChange', callback);
  }

  onError(callback) {
    this.callbacks.onError.push(callback);
    return () => this.removeCallback('onError', callback);
  }

  onReconnect(callback) {
    this.callbacks.onReconnect.push(callback);
    return () => this.removeCallback('onReconnect', callback);
  }

  removeCallback(type, callback) {
    const callbacks = this.callbacks[type];
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  // ===========================================
  // ENHANCED NOTIFICATION METHODS
  // ===========================================

  notifyNewLog(logData) {
    this.callbacks.onNewLog.forEach(callback => {
      try {
        callback(logData);
      } catch (error) {
        console.error('❌ New log callback error:', error);
      }
    });
  }

  notifyStatsUpdate(statsData) {
    this.callbacks.onStatsUpdate.forEach(callback => {
      try {
        callback(statsData);
      } catch (error) {
        console.error('❌ Stats update callback error:', error);
      }
    });
  }

  notifyRealTimeStats(statsData) {
    this.callbacks.onRealTimeStats.forEach(callback => {
      try {
        callback(statsData);
      } catch (error) {
        console.error('❌ Real-time stats callback error:', error);
      }
    });
  }

  notifySecurityAlert(alertData) {
    this.callbacks.onSecurityAlert.forEach(callback => {
      try {
        callback(alertData);
      } catch (error) {
        console.error('❌ Security alert callback error:', error);
      }
    });
  }

  notifyTrafficSummary(summaryData) {
    this.callbacks.onTrafficSummary.forEach(callback => {
      try {
        callback(summaryData);
      } catch (error) {
        console.error('❌ Traffic summary callback error:', error);
      }
    });
  }

  notifyMonitoringStatusChange(statusData) {
    this.callbacks.onMonitoringStatusChange.forEach(callback => {
      try {
        callback(statusData);
      } catch (error) {
        console.error('❌ Monitoring status callback error:', error);
      }
    });
  }

  notifyConnectionChange(connected) {
    this.callbacks.onConnectionChange.forEach(callback => {
      try {
        callback(connected, this.connectionQuality, this.getConnectionMetrics());
      } catch (error) {
        console.error('❌ Connection change callback error:', error);
      }
    });
  }

  notifyError(error) {
    this.callbacks.onError.forEach(callback => {
      try {
        callback(error);
      } catch (error) {
        console.error('❌ Error callback error:', error);
      }
    });
  }

  notifyReconnect() {
    this.callbacks.onReconnect.forEach(callback => {
      try {
        callback(this.reconnectAttempts, this.connectionMetrics.reconnectCount);
      } catch (error) {
        console.error('❌ Reconnect callback error:', error);
      }
    });
  }

  // ===========================================
  // RECONNECTION MANAGEMENT (Keep existing)
  // ===========================================

  scheduleReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ WebSocket max reconnection attempts reached');
      this.connectionQuality = 'disconnected';
      this.notifyError('Maksimum yeniden bağlantı denemesi aşıldı');
      return;
    }

    const delay = Math.min(
      this.reconnectInterval * Math.pow(2, this.reconnectAttempts),
      30000 // Max 30 seconds
    );

    this.log(`🔄 WebSocket scheduling reconnection attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts} in ${delay}ms`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.connectionMetrics.reconnectCount++;
      this.connect();
    }, delay);
  }

  stopReconnection() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  // ===========================================
  // HEARTBEAT MANAGEMENT (Keep existing)
  // ===========================================

  startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected) {
        this.send({ type: 'ping', timestamp: new Date().toISOString() });

        // Check if we haven't received a response in too long
        if (this.lastPingTime && (Date.now() - this.lastPingTime) > 60000) {
          console.warn('⚠️ WebSocket heartbeat timeout - connection may be dead');
          this.connectionQuality = 'poor';
          this.ws?.close();
        }
      }
    }, this.heartbeatInterval);
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  updateConnectionQuality() {
    if (this.lastPingTime) {
      const timeSinceLastPing = Date.now() - this.lastPingTime;
      if (timeSinceLastPing < 5000) {
        this.connectionQuality = 'good';
      } else if (timeSinceLastPing < 15000) {
        this.connectionQuality = 'poor';
      } else {
        this.connectionQuality = 'disconnected';
      }
    }
  }

  // ===========================================
  // MESSAGE HANDLING (Keep existing)
  // ===========================================

  send(data) {
    if (this.isConnected && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(data));
        this.connectionMetrics.messagesSent++;
        return true;
      } catch (error) {
        console.error('❌ WebSocket send error:', error);
        this.addToMessageQueue(data);
        return false;
      }
    } else {
      this.addToMessageQueue(data);
      return false;
    }
  }

  addToMessageQueue(data) {
    if (this.messageQueue.length >= this.maxQueueSize) {
      this.messageQueue.shift();
    }
    this.messageQueue.push(data);
  }

  flushMessageQueue() {
    let flushedCount = 0;
    while (this.messageQueue.length > 0 && this.isConnected) {
      const message = this.messageQueue.shift();
      if (!this.send(message)) {
        this.messageQueue.unshift(message);
        break;
      }
      flushedCount++;
    }
    if (flushedCount > 0) {
      this.log(`📤 WebSocket flushed ${flushedCount} queued messages`);
    }
  }

  // ===========================================
  // ENHANCED STATUS AND METRICS
  // ===========================================

  getStatus() {
    return {
      isConnected: this.isConnected,
      connectionQuality: this.connectionQuality,
      reconnectAttempts: this.reconnectAttempts,
      queuedMessages: this.messageQueue.length,
      lastPingTime: this.lastPingTime,
      webSocketState: this.ws ? this.ws.readyState : null,
      endpoint: this.ws ? this.ws.url : null
    };
  }

  getConnectionQuality() {
    return this.connectionQuality;
  }

  getConnectionMetrics() {
    return {
      ...this.connectionMetrics,
      currentState: this.getStatus(),
      uptime: this.connectionMetrics.connectTime ?
        Date.now() - this.connectionMetrics.connectTime.getTime() : 0,
      messageRates: {
        logsPerMinute: this.connectionMetrics.logMessagesReceived,
        statsPerMinute: this.connectionMetrics.statsUpdatesReceived,
        alertsPerMinute: this.connectionMetrics.alertsReceived
      }
    };
  }

  // ===========================================
  // UTILITY METHODS
  // ===========================================

  isHealthy() {
    return this.isConnected &&
           this.connectionQuality !== 'disconnected' &&
           this.ws?.readyState === WebSocket.OPEN;
  }

  getReadyState() {
    if (!this.ws) return 'CLOSED';
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING: return 'CONNECTING';
      case WebSocket.OPEN: return 'OPEN';
      case WebSocket.CLOSING: return 'CLOSING';
      case WebSocket.CLOSED: return 'CLOSED';
      default: return 'UNKNOWN';
    }
  }

  // Enhanced logging with debug support
  log(...args) {
    if (this.debug) {
      console.log('[WebSocket]', ...args);
    }
  }

  // For debugging
  getDebugInfo() {
    return {
      status: this.getStatus(),
      metrics: this.getConnectionMetrics(),
      readyState: this.getReadyState(),
      queueSize: this.messageQueue.length,
      callbackCounts: Object.keys(this.callbacks).reduce((acc, key) => {
        acc[key] = this.callbacks[key].length;
        return acc;
      }, {}),
      connectionHistory: {
        connectTime: this.connectionMetrics.connectTime,
        disconnectTime: this.connectionMetrics.disconnectTime,
        reconnectCount: this.connectionMetrics.reconnectCount
      }
    };
  }

  // ===========================================
  // NEW: SUBSCRIPTION HELPERS
  // ===========================================

  /**
   * Subscribe to all log-related events with a single callback
   */
  subscribeToLogEvents(callbacks) {
    const unsubscribers = [];

    if (callbacks.onNewLog) {
      unsubscribers.push(this.onNewLog(callbacks.onNewLog));
    }
    if (callbacks.onStatsUpdate) {
      unsubscribers.push(this.onStatsUpdate(callbacks.onStatsUpdate));
    }
    if (callbacks.onSecurityAlert) {
      unsubscribers.push(this.onSecurityAlert(callbacks.onSecurityAlert));
    }
    if (callbacks.onConnectionChange) {
      unsubscribers.push(this.onConnectionChange(callbacks.onConnectionChange));
    }
    if (callbacks.onError) {
      unsubscribers.push(this.onError(callbacks.onError));
    }

    // Return function to unsubscribe from all
    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }

  /**
   * Request specific data types from server
   */
  requestData(dataTypes = ['logs', 'stats', 'alerts']) {
    this.send({
      type: 'request_data',
      data_types: dataTypes,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Set filtering preferences for real-time data
   */
  setFilters(filters) {
    this.send({
      type: 'set_filters',
      filters: filters,
      timestamp: new Date().toISOString()
    });
  }
}

// Create and export singleton instance
export const webSocketService = new RobustWebSocketService();

// For debugging in browser console
if (typeof window !== 'undefined') {
  window.webSocketService = webSocketService;
}

export default webSocketService;