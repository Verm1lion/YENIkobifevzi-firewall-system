import React from 'react';

const StatCard = ({ title, value, subtitle, icon, color = 'blue', trend, size = 'normal' }) => {
  const getColorClasses = (color) => {
    const colors = {
      green: 'text-green-400 bg-green-500/10 border-green-500/20',
      blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
      yellow: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
      red: 'text-red-400 bg-red-500/10 border-red-500/20',
      purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
      gray: 'text-gray-400 bg-gray-500/10 border-gray-500/20'
    };
    return colors[color] || colors.blue;
  };

  const getSizeClasses = (size) => {
    return size === 'large' ? 'p-6' : 'p-4';
  };

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
  );
};

export default StatCard;