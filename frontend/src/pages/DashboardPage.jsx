import React, { Suspense, lazy } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Helmet } from 'react-helmet-async'
import {
  FiShield,
  FiActivity,
  FiServer,
  FiUsers,
  FiAlertTriangle,
  FiCheck,
  FiX,
  FiClock,
} from 'react-icons/fi'
import apiService from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'

const DashboardPage = () => {
  const { t } = useTranslation()

  // Fetch dashboard data
  const { data: systemStats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['systemStats'],
    queryFn: apiService.getSystemStats,
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  const { data: firewallStats, isLoading: firewallLoading } = useQuery({
    queryKey: ['firewallStats'],
    queryFn: apiService.getFirewallStats,
    refetchInterval: 60000, // Refresh every minute
  })

  const { data: recentAlerts, isLoading: alertsLoading } = useQuery({
    queryKey: ['recentAlerts'],
    queryFn: () => apiService.getSecurityAlerts({ limit: 5 }),
    refetchInterval: 30000,
  })

  const { data: systemHealth, isLoading: healthLoading } = useQuery({
    queryKey: ['systemHealth'],
    queryFn: apiService.getSystemHealth,
    refetchInterval: 60000,
  })

  const isLoading = statsLoading || firewallLoading || alertsLoading || healthLoading

  if (statsError) {
    return (
      <div className="p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> Failed to load dashboard data</span>
        </div>
      </div>
    )
  }

  return (
    <>
      <Helmet>
        <title>Dashboard - KOBI Firewall</title>
      </Helmet>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="md:flex md:items-center md:justify-between">
          <div className="flex-1">
            <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              Dashboard
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              System overview and monitoring
            </p>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4">
            <div className="flex items-center space-x-2">
              <div className={`h-3 w-3 rounded-full ${systemHealth?.status === 'healthy' ? 'bg-green-400' : 'bg-red-400'}`}></div>
              <span className="text-sm text-gray-600">
                {systemHealth?.status === 'healthy' ? 'System Healthy' : 'System Issues'}
              </span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Firewall Rules"
            value={firewallStats?.total_rules || 0}
            change={`${firewallStats?.enabled_rules || 0} active`}
            icon={FiShield}
            loading={isLoading}
          />
          <StatCard
            title="Blocked Threats"
            value={systemStats?.blocked_requests_24h || 0}
            change="Last 24h"
            icon={FiX}
            loading={isLoading}
          />
          <StatCard
            title="Active Connections"
            value={systemStats?.active_connections || 0}
            change={`${systemStats?.new_connections_rate || 0}/min`}
            icon={FiActivity}
            loading={isLoading}
          />
          <StatCard
            title="System Uptime"
            value={formatUptime(systemStats?.uptime_seconds)}
            change="Running"
            icon={FiClock}
            loading={isLoading}
          />
        </div>

        {/* Recent Alerts */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Recent Security Alerts
              </h3>
              <button className="text-sm text-blue-600 hover:text-blue-500">
                View All
              </button>
            </div>
          </div>
          <div className="border-t border-gray-200">
            {alertsLoading ? (
              <div className="p-6">
                <LoadingSpinner />
              </div>
            ) : recentAlerts?.data?.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {recentAlerts.data.map((alert) => (
                  <li key={alert.id} className="p-6">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className={`h-2 w-2 rounded-full ${getSeverityColor(alert.severity)}`}></div>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {alert.title}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {alert.description}
                        </p>
                      </div>
                      <div className="flex-shrink-0 text-sm text-gray-500">
                        {formatRelativeTime(alert.created_at)}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-6 text-center">
                <FiCheck className="mx-auto h-12 w-12 text-green-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  No Security Alerts
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  All systems are operating normally
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

// Helper Components
const StatCard = ({ title, value, change, icon: Icon, loading }) => {
  if (loading) {
    return (
      <div className="card">
        <div className="card-body">
          <LoadingSpinner />
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="card-body">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <Icon className="h-6 w-6 text-gray-400" />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">
                {title}
              </dt>
              <dd>
                <div className="text-lg font-medium text-gray-900">
                  {value}
                </div>
              </dd>
            </dl>
          </div>
        </div>
        <div className="mt-3">
          <div className="text-sm text-gray-500">
            {change}
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper Functions
const formatUptime = (seconds) => {
  if (!seconds) return '0m'
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

const getSeverityColor = (severity) => {
  switch (severity?.toLowerCase()) {
    case 'critical': return 'bg-red-500'
    case 'high': return 'bg-orange-500'
    case 'medium': return 'bg-yellow-500'
    case 'low': return 'bg-blue-500'
    default: return 'bg-gray-500'
  }
}

const formatRelativeTime = (dateString) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffInMinutes = Math.floor((now - date) / (1000 * 60))
  if (diffInMinutes < 1) return 'Just now'
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `${diffInHours}h ago`
  const diffInDays = Math.floor(diffInHours / 24)
  return `${diffInDays}d ago`
}

export default DashboardPage