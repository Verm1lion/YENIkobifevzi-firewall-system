import React, { useState } from 'react';
import { FaShieldAlt, FaHome, FaChartBar, FaShield, FaCogs, FaNetworkWired, FaRoute, FaServer, FaDns, FaWrench, FaFileAlt, FaSync, FaSignOutAlt, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';

const Sidebar = ({ activeMenu, setActiveMenu }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { logout } = useAuth();

  const menuItems = [
    { id: 'home', label: 'Ana Sayfa', icon: FaHome },
    { id: 'logs', label: 'Loglar', icon: FaChartBar },
    { id: 'security-rules', label: 'Güvenlik Kuralları', icon: FaShield },
    { id: 'rule-groups', label: 'Kural Grupları', icon: FaCogs },
    { id: 'interface-settings', label: 'İnterface Ayarları', icon: FaNetworkWired },
    { id: 'nat-settings', label: 'NAT Ayarları', icon: FaRoute },
    { id: 'routes', label: 'Rotalar', icon: FaRoute },
    { id: 'dns-management', label: 'DNS Yönetimi', icon: FaDns },
    { id: 'settings', label: 'Ayarlar', icon: FaWrench },
    { id: 'reports', label: 'Raporlar', icon: FaFileAlt },
    { id: 'updates', label: 'Güncellemeler', icon: FaSync }
  ];

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Başarıyla çıkış yapıldı');
    } catch (error) {
      toast.error('Çıkış yapılırken hata oluştu');
    }
  };

  return (
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

      {/* Navigation Menu */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeMenu === item.id;

            return (
              <li key={item.id}>
                <button
                  onClick={() => setActiveMenu(item.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'text-gray-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                  title={isCollapsed ? item.label : ''}
                >
                  <Icon className={`text-lg ${isActive ? 'text-white' : ''}`} />
                  {!isCollapsed && (
                    <span className="font-medium">{item.label}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Logout Button */}
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
  );
};

export default Sidebar;