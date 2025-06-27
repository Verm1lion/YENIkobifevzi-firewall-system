import React, { useState, useEffect } from 'react';
import { FaChartLine } from 'react-icons/fa';

const AnalyticsChart = () => {
  const [activeFilter, setActiveFilter] = useState('24h');
  const [chartData, setChartData] = useState({
    totalConnections: [],
    blockedConnections: []
  });

  const filters = [
    { key: '24h', label: '24sa' },
    { key: '7d', label: '7g' },
    { key: '30d', label: '30g' }
  ];

  // Simulated data generation
  useEffect(() => {
    const generateData = () => {
      const hours = Array.from({length: 24}, (_, i) => {
        const hour = i.toString().padStart(2, '0') + ':00';
        const totalConnections = Math.floor(Math.random() * 500) + 200;
        const blockedConnections = Math.floor(totalConnections * (Math.random() * 0.2 + 0.05));

        return {
          time: hour,
          total: totalConnections,
          blocked: blockedConnections
        };
      });

      setChartData({
        totalConnections: hours.map(h => ({ time: h.time, value: h.total })),
        blockedConnections: hours.map(h => ({ time: h.time, value: h.blocked }))
      });
    };

    generateData();
    const interval = setInterval(generateData, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [activeFilter]);

  const maxValue = Math.max(
    ...chartData.totalConnections.map(d => d.value),
    ...chartData.blockedConnections.map(d => d.value)
  );

  return (
    <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <FaChartLine className="text-blue-400 text-xl" />
          <h3 className="text-white font-semibold text-lg">Analitik</h3>
        </div>
        <div className="flex bg-slate-700/50 rounded-lg p-1">
          {filters.map((filter) => (
            <button
              key={filter.key}
              onClick={() => setActiveFilter(filter.key)}
              className={`px-3 py-1 text-sm rounded-md transition-all ${
                activeFilter === filter.key
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-gray-400 text-sm mb-6">Zaman içindeki ağ etkinliği</p>

      {/* Chart Container */}
      <div className="relative h-64 bg-slate-900/30 rounded-lg p-4">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-500 py-4">
          <span>{maxValue}</span>
          <span>{Math.floor(maxValue * 0.75)}</span>
          <span>{Math.floor(maxValue * 0.5)}</span>
          <span>{Math.floor(maxValue * 0.25)}</span>
          <span>0</span>
        </div>

        {/* Chart Area */}
        <div className="ml-8 h-full relative">
          <svg className="w-full h-full" viewBox="0 0 800 200">
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => (
              <line
                key={index}
                x1="0"
                y1={200 - (ratio * 180)}
                x2="800"
                y2={200 - (ratio * 180)}
                stroke="#334155"
                strokeWidth="0.5"
                opacity="0.5"
              />
            ))}

            {/* Total Connections Line */}
            <path
              d={`M ${chartData.totalConnections.map((point, index) =>
                `${(index / (chartData.totalConnections.length - 1)) * 800},${200 - ((point.value / maxValue) * 180)}`
              ).join(' L ')}`}
              fill="none"
              stroke="#3B82F6"
              strokeWidth="3"
              className="drop-shadow-lg"
            />

            {/* Blocked Connections Line */}
            <path
              d={`M ${chartData.blockedConnections.map((point, index) =>
                `${(index / (chartData.blockedConnections.length - 1)) * 800},${200 - ((point.value / maxValue) * 180)}`
              ).join(' L ')}`}
              fill="none"
              stroke="#EF4444"
              strokeWidth="2"
              className="drop-shadow-lg"
            />

            {/* Area fill for total connections */}
            <path
              d={`M ${chartData.totalConnections.map((point, index) =>
                `${(index / (chartData.totalConnections.length - 1)) * 800},${200 - ((point.value / maxValue) * 180)}`
              ).join(' L ')} L 800,200 L 0,200 Z`}
              fill="url(#totalGradient)"
              opacity="0.1"
            />

            {/* Gradients */}
            <defs>
              <linearGradient id="totalGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style={{stopColor: '#3B82F6', stopOpacity: 0.3}} />
                <stop offset="100%" style={{stopColor: '#3B82F6', stopOpacity: 0}} />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* X-axis labels */}
        <div className="flex justify-between text-xs text-gray-500 mt-2 ml-8">
          {['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'].map((time, index) => (
            <span key={index}>{time}</span>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center space-x-6 mt-4">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          <span className="text-gray-400 text-sm">Toplam Bağlantı</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <span className="text-gray-400 text-sm">Engellenen</span>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsChart;