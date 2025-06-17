import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { FiWifi, FiWifiOff, FiDatabase, FiServer } from 'react-icons/fi'
import apiService from '../services/api'

const StatusIndicator = () => {
  const { data: systemHealth } = useQuery({
    queryKey: ['systemHealth'],
    queryFn: apiService.getSystemHealth,
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: 1,
  })

  const indicators = [
    {
      name: 'Network',
      status: systemHealth?.network || 'unknown',
      icon: systemHealth?.network === 'healthy' ? FiWifi : FiWifiOff,
    },
    {
      name: 'Database',
      status: systemHealth?.database || 'unknown',
      icon: FiDatabase,
    },
    {
      name: 'API',
      status: systemHealth?.api || 'healthy',
      icon: FiServer,
    },
  ]

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy': return 'text-green-500'
      case 'warning': return 'text-yellow-500'
      case 'error': return 'text-red-500'
      default: return 'text-gray-500'
    }
  }

  return (
    <div className="flex items-center space-x-4 ml-4">
      {indicators.map((indicator) => {
        const Icon = indicator.icon
        return (
          <div
            key={indicator.name}
            className="flex items-center space-x-1"
            title={`${indicator.name}: ${indicator.status}`}
          >
            <Icon className={`h-4 w-4 ${getStatusColor(indicator.status)}`} />
            <span className="text-xs text-gray-600 hidden sm:inline">
              {indicator.name}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export default StatusIndicator