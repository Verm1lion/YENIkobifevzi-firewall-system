import mongoose from 'mongoose';

const networkActivitySchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now,
    expires: 604800 // 7 gün sonra otomatik silinir
  },
  sourceIp: {
    type: String,
    required: true
  },
  destinationIp: String,
  domain: String,
  port: {
    type: Number,
    required: true
  },
  protocol: {
    type: String,
    enum: ['TCP', 'UDP', 'ICMP'],
    default: 'TCP'
  },
  action: {
    type: String,
    enum: ['allowed', 'blocked', 'warning'],
    required: true
  },
  ruleId: String,
  reason: String,
  bytesTransferred: {
    type: Number,
    default: 0
  },
  threat: {
    detected: {
      type: Boolean,
      default: false
    },
    type: {
      type: String,
      enum: ['malware', 'phishing', 'ddos', 'suspicious', 'none'],
      default: 'none'
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low'
    }
  }
}, {
  timestamps: true
});

// Indexes
networkActivitySchema.index({ timestamp: -1 });
networkActivitySchema.index({ sourceIp: 1 });
networkActivitySchema.index({ action: 1 });
networkActivitySchema.index({ 'threat.detected': 1 });

export const NetworkActivity = mongoose.model('NetworkActivity', networkActivitySchema);