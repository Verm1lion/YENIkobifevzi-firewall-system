import mongoose from 'mongoose';

const firewallRuleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: String,
  isActive: {
    type: Boolean,
    default: true
  },
  priority: {
    type: Number,
    default: 100
  },
  source: {
    ip: String,
    subnet: String,
    port: String
  },
  destination: {
    ip: String,
    subnet: String,
    port: String
  },
  protocol: {
    type: String,
    enum: ['TCP', 'UDP', 'ICMP', 'ANY'],
    default: 'ANY'
  },
  action: {
    type: String,
    enum: ['allow', 'block', 'log'],
    required: true
  },
  schedule: {
    enabled: {
      type: Boolean,
      default: false
    },
    startTime: String,
    endTime: String,
    days: [String]
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastModified: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

firewallRuleSchema.index({ isActive: 1, priority: 1 });
firewallRuleSchema.index({ createdBy: 1 });

export const FirewallRule = mongoose.model('FirewallRule', firewallRuleSchema);