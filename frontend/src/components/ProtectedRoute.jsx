import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import LoadingSpinner from './LoadingSpinner'

const ProtectedRoute = ({ children, adminRequired = false, permission = null }) => {
  const {
    isAuthenticated,
    isLoading,
    userRole,
    isAdmin,
    hasPermission,
    canAccessNAT
  } = useAuth()
  const location = useLocation()

  console.log('🔒 Enhanced ProtectedRoute check:', {
    isAuthenticated,
    isLoading,
    userRole,
    adminRequired,
    permission,
    path: location.pathname,
    isAdmin: isAdmin(),
    canAccessNAT: canAccessNAT()
  })

  // Loading state
  if (isLoading) {
    console.log('⏳ ProtectedRoute: Auth loading...')
    return <LoadingSpinner message="Yetki kontrol ediliyor..." />
  }

  // Authentication check
  if (!isAuthenticated) {
    console.log('❌ ProtectedRoute: Not authenticated, redirecting to login')
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Admin requirement check
  if (adminRequired && !isAdmin()) {
    console.log('🚫 ProtectedRoute: Admin required but user is not admin:', {
      userRole,
      required: 'admin',
      path: location.pathname
    })

    // Redirect to dashboard with error message
    return (
      <Navigate
        to="/dashboard"
        state={{
          from: location,
          error: 'Bu sayfaya erişim için admin yetkisi gereklidir.'
        }}
        replace
      />
    )
  }

  // Specific permission check
  if (permission && !hasPermission(permission)) {
    console.log('🚫 ProtectedRoute: Required permission not found:', {
      userRole,
      requiredPermission: permission,
      path: location.pathname
    })

    return (
      <Navigate
        to="/dashboard"
        state={{
          from: location,
          error: `Bu sayfaya erişim için '${permission}' yetkisi gereklidir.`
        }}
        replace
      />
    )
  }

  // NAT-specific access control
  if (location.pathname === '/nat-settings' && !canAccessNAT()) {
    console.log('🚫 ProtectedRoute: NAT access denied:', {
      userRole,
      path: location.pathname,
      canAccessNAT: canAccessNAT()
    })

    return (
      <Navigate
        to="/dashboard"
        state={{
          from: location,
          error: 'NAT ayarlarına erişim için admin yetkisi gereklidir.'
        }}
        replace
      />
    )
  }

  // Interface Settings access control
  if (location.pathname === '/interface-settings' && !isAdmin()) {
    console.log('🚫 ProtectedRoute: Interface Settings access denied:', {
      userRole,
      path: location.pathname
    })

    return (
      <Navigate
        to="/dashboard"
        state={{
          from: location,
          error: 'Interface ayarlarına erişim için admin yetkisi gereklidir.'
        }}
        replace
      />
    )
  }

  // Security Rules access control (example)
  if (location.pathname === '/security-rules' && !hasPermission('firewall_management') && !isAdmin()) {
    console.log('🚫 ProtectedRoute: Security Rules access denied:', {
      userRole,
      path: location.pathname
    })

    return (
      <Navigate
        to="/dashboard"
        state={{
          from: location,
          error: 'Güvenlik kurallarını yönetmek için yetki gereklidir.'
        }}
        replace
      />
    )
  }

  console.log('✅ ProtectedRoute: All checks passed, showing protected content:', {
    isAuthenticated: true,
    userRole,
    path: location.pathname,
    hasRequiredAccess: true
  })

  return children
}

// HOC wrapper for easier admin route protection
export const AdminRoute = ({ children }) => {
  return (
    <ProtectedRoute adminRequired={true}>
      {children}
    </ProtectedRoute>
  )
}

// HOC wrapper for permission-based protection
export const PermissionRoute = ({ children, permission }) => {
  return (
    <ProtectedRoute permission={permission}>
      {children}
    </ProtectedRoute>
  )
}

// HOC wrapper for NAT-specific protection
export const NATRoute = ({ children }) => {
  const { canAccessNAT } = useAuth()

  return (
    <ProtectedRoute adminRequired={true}>
      {children}
    </ProtectedRoute>
  )
}

export default ProtectedRoute