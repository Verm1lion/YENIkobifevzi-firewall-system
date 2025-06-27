import React from 'react';
import {
  FaCheckCircle,
  FaExclamationTriangle,
  FaTimesCircle,
  FaClock,
  FaShieldAlt,
  FaLock,
  FaServer
} from 'react-icons/fa';

const SystemStatusCard = ({
  title,
  icon: Icon,
  status,
  description,
  color = 'green',
  lastUpdated,
  details = [],
  className = ''
}) => {
  const getStatusIcon = () => {
    switch (color) {
      case 'green':
        return <FaCheckCircle className="text-green-400" />;
      case 'yellow':
        return <FaExclamationTriangle className="text-yellow-400" />;
      case 'red':
        return <FaTimesCircle className="text-red-400" />;
      default:
        return <FaCheckCircle className="text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    switch (color) {
      case 'green':
        return 'text-green-400';
      case 'yellow':
        return 'text-yellow-400';
      case 'red':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getBorderColor = () => {
    switch (color) {
      case 'green':
        return 'border-green-500/20';
      case 'yellow':
        return 'border-yellow-500/20';
      case 'red':
        return 'border-red-500/20';
      default:
        return 'border-gray-500/20';
    }
  };

  return (
    <div className={`bg-slate-800/50 backdrop-blur-xl rounded-xl border ${getBorderColor()} p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`bg-${color}-500/20 p-2 rounded-lg`}>
            <Icon className={`text-${color}-400 text-xl`} />
          </div>
          <h3 className="text-white font-semibold text-lg">{title}</h3>
        </div>
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <span className={`font-medium ${getStatusColor()}`}>{status}</span>
        </div>
      </div>

      {/* Description */}
      {description && (
        <p className="text-gray-400 text-sm mb-4">{description}</p>
      )}

      {/* Details */}
      {details.length > 0 && (
        <div className="space-y-3 mb-4">
          {details.map((detail, index) => (
            <div key={index} className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">{detail.label}:</span>
              <span className={`text-sm font-medium ${detail.color ? `text-${detail.color}-400` : 'text-white'}`}>
                {detail.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Last Updated */}
      {lastUpdated && (
        <div className="flex items-center space-x-2 text-gray-500 text-xs pt-4 border-t border-slate-700/50">
          <FaClock />
          <span>Son güncelleme: {lastUpdated}</span>
        </div>
      )}
    </div>
  );
};

// Predefined Status Cards
export const FirewallStatusCard = ({ status, lastScan, rulesCount }) => (
  <SystemStatusCard
    title="Firewall Durumu"
    icon={FaShieldAlt}
    status={status}
    color={status === 'Aktif' ? 'green' : 'red'}
    description="Sistem güvenlik duvarı durumu"
    details={[
      { label: 'Aktif Kurallar', value: rulesCount || '0' },
      { label: 'Son Tarama', value: lastScan || 'Bilinmiyor' }
    ]}
    lastUpdated={new Date().toLocaleString('tr-TR')}
  />
);

export const SSLStatusCard = ({ status, expiryDate, issuer }) => (
  <SystemStatusCard
    title="SSL Sertifikası"
    icon={FaLock}
    status={status}
    color={status === 'Güncel' ? 'green' : status === 'Yakında Sona Erecek' ? 'yellow' : 'red'}
    description="SSL sertifikası durumu ve geçerlilik"
    details={[
      { label: 'Sona Erme', value: expiryDate || 'Bilinmiyor' },
      { label: 'Verici', value: issuer || 'Self-Signed' }
    ]}
    lastUpdated={new Date().toLocaleString('tr-TR')}
  />
);

export const SystemHealthCard = ({ status, uptime, loadAverage }) => (
  <SystemStatusCard
    title="Sistem Sağlığı"
    icon={FaServer}
    status={status}
    color={status === 'Sağlıklı' ? 'green' : status === 'Uyarı' ? 'yellow' : 'red'}
    description="Genel sistem durumu ve performans"
    details={[
      { label: 'Çalışma Süresi', value: uptime || 'Bilinmiyor' },
      { label: 'Yük Ortalaması', value: loadAverage || '0.0' }
    ]}
    lastUpdated={new Date().toLocaleString('tr-TR')}
  />
);

export default SystemStatusCard;