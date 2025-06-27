import mongoose from 'mongoose';

const systemStatsSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now,
    expires: 2592000 // 30 gün sonra otomatik silinir
  },
  totalConnections: {
    type: Number,
    default: 0
  },
  blockedConnections: {
    type: Number,
    default: 0
  },
  allowedConnections: {
    type: Number,
    default: 0
  },
  threats: {
    type: Number,
    default: 0
  },
  activeRules: {
    type: Number,
    default: 0
  },
  connectedDevices: [{
    ip: String,
    mac: String,
    hostname: String,
    lastSeen: Date,
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active'
    }
  }],
  networkActivity: [{
    hour: Number,
    totalConnections: Number,
    blockedConnections: Number,
    timestamp: Date
  }],
  systemStatus: {
    firewallActive: {
      type: Boolean,
      default: true
    },
    lastUpdate: {
      type: Date,
      default: Date.now
    },
    uptime: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

// Indexes for better performance
systemStatsSchema.index({ timestamp: -1 });
systemStatsSchema.index({ 'connectedDevices.ip': 1 });

export const SystemStats = mongoose.model('SystemStats', systemStatsSchema);