import React, { useState, useEffect } from 'react';
import { FaClock, FaShieldAlt, FaExclamationTriangle, FaCheckCircle, FaBan } from 'react-icons/fa';

const RecentActivity = () => {
  const [activities, setActivities] = useState([]);

  const activityTypes = {
    blocked: { icon: FaBan, color: 'text-red-400', bg: 'bg-red-500/10' },
    allowed: { icon: FaCheckCircle, color: 'text-green-400', bg: 'bg-green-500/10' },
    warning: { icon: FaExclamationTriangle, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    info: { icon: FaShieldAlt, color: 'text-blue-400', bg: 'bg-blue-500/10' }
  };

  const generateActivity = () => {
    const domains = [
      'malware.com', 'github.com', 'suspicious-site.net', 'vercel.com',
      'api.example.com', 'safe-site.org', 'threat.xyz', 'legitimate-api.com'
    ];

    const ips = [
      '192.168.1.10', '10.0.0.15', '172.16.0.8', '192.168.1.25',
      '10.0.0.32', '172.16.0.45', '192.168.1.100', '10.0.0.200'
    ];

    const activityTemplates = [
      { type: 'blocked', message: 'Engellendi', detail: 'Kötü amaçlı site' },
      { type: 'allowed', message: 'İzin Verildi', detail: 'Güvenli bağlantı' },
      { type: 'blocked', message: 'Engellendi', detail: 'Şüpheli aktivite' },
      { type: 'warning', message: 'Uyarı', detail: 'Yüksek bant genişliği' },
      { type: 'info', message: 'Bilgi', detail: 'Kural güncellendi' }
    ];

    const template = activityTemplates[Math.floor(Math.random() * activityTemplates.length)];
    const domain = domains[Math.floor(Math.random() * domains.length)];
    const ip = ips[Math.floor(Math.random() * ips.length)];

    return {
      id: Date.now() + Math.random(),
      type: template.type,
      message: template.message,
      detail: template.detail,
      domain: domain,
      ip: ip,
      timestamp: new Date(),
      port: Math.floor(Math.random() * 65535) + 1
    };
  };

  useEffect(() => {
    // Initial activities
    const initialActivities = Array.from({length: 8}, () => generateActivity());
    setActivities(initialActivities);

    // Add new activity every 5 seconds
    const interval = setInterval(() => {
      setActivities(prev => {
        const newActivity = generateActivity();
        return [newActivity, ...prev.slice(0, 7)]; // Keep only 8 most recent
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (timestamp) => {
    const now = new Date();
    const diff = Math.floor((now - timestamp) / 1000);

    if (diff < 60) return `${diff} sn önce`;
    if (diff < 3600) return `${Math.floor(diff / 60)} dk önce`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} sa önce`;
    return `${Math.floor(diff / 86400)} gün önce`;
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6">
      <div className="flex items-center space-x-3 mb-6">
        <FaClock className="text-blue-400 text-xl" />
        <h3 className="text-white font-semibold text-lg">Son Etkinlik</h3>
      </div>

      <p className="text-gray-400 text-sm mb-4">Son ağ olayları</p>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {activities.map((activity) => {
          const ActivityIcon = activityTypes[activity.type].icon;

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
          );
        })}
      </div>
    </div>
  );
};

export default RecentActivity;