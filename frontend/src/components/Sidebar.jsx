import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  FiHome,
  FiShield,
  FiUsers,
  FiGlobe,
  FiFileText,
  FiSettings,
  FiX,
  FiChevronLeft,
  FiChevronRight,
} from 'react-icons/fi'

const Sidebar = ({ open, onClose, collapsed, onToggleCollapse }) => {
  const location = useLocation()

  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: FiHome,
    },
    {
      name: 'Firewall Rules',
      href: '/firewall/rules',
      icon: FiShield,
    },
    {
      name: 'Network',
      href: '/network',
      icon: FiGlobe,
    },
    {
      name: 'Logs',
      href: '/logs',
      icon: FiFileText,
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: FiSettings,
    },
  ]

  const isActive = (href) => {
    return location.pathname === href || location.pathname.startsWith(href + '/')
  }

  return (
    <>
      {/* Desktop sidebar */}
      <div className={`hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:bg-gray-800 lg:transition-all lg:duration-300 ${
        collapsed ? 'lg:w-16' : 'lg:w-64'
      }`}>
        <div className="flex flex-col flex-1 min-h-0">
          {/* Logo */}
          <div className="flex items-center h-16 flex-shrink-0 px-4 bg-gray-900">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                  <FiShield className="w-5 h-5 text-white" />
                </div>
              </div>
              {!collapsed && (
                <div className="ml-3">
                  <h1 className="text-white text-lg font-semibold">
                    KOBI Firewall
                  </h1>
                </div>
              )}
            </div>
            <button
              onClick={onToggleCollapse}
              className="ml-auto p-1 rounded-md text-gray-400 hover:text-white hover:bg-gray-700"
            >
              {collapsed ? (
                <FiChevronRight className="w-4 h-4" />
              ) : (
                <FiChevronLeft className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.href}
                  to={item.href}
                  className={`flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive(item.href)
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  <Icon className="mr-3 flex-shrink-0 h-5 w-5" />
                  {!collapsed && <span>{item.name}</span>}
                </NavLink>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Mobile sidebar */}
      <div className={`fixed inset-y-0 left-0 z-30 w-64 bg-gray-800 transform transition-transform duration-300 lg:hidden ${
        open ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between h-16 px-4 bg-gray-900">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <FiShield className="w-5 h-5 text-white" />
              </div>
              <h1 className="ml-3 text-white text-lg font-semibold">
                KOBI Firewall
              </h1>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-gray-700"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
            {navigationItems.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.href}
                  to={item.href}
                  onClick={onClose}
                  className={`flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive(item.href)
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  <Icon className="mr-3 flex-shrink-0 h-5 w-5" />
                  <span>{item.name}</span>
                </NavLink>
              )
            })}
          </nav>
        </div>
      </div>
    </>
  )
}

export default Sidebar