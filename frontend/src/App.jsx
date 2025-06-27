import React, { useState, useEffect, useRef, useMemo } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import './App.css'

import { AuthProvider } from './contexts/AuthContext'
import LoadingSpinner from './components/LoadingSpinner'
import ErrorBoundary from './components/ErrorBoundary'
import ProtectedRoute from './components/ProtectedRoute'

import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Reports from './pages/Reports'
import Updates from './pages/Updates'
import Settings from './pages/Settings'
import NatSettings from './pages/NatSettings'
import DnsManagement from './pages/DnsManagement'
import RoutesPage from './pages/Routes'
import RuleGroups from './pages/RuleGroups'
import InterfaceSettings from './pages/InterfaceSettings'
import SecurityRules from './pages/SecurityRules'
import Logs from './pages/Logs'

// Enhanced App Initializer - Backend entegrasyonu ile
class AppInitializer {
  constructor() {
    this.isInitialized = false
    this.isInitializing = false
    this.initPromise = null
    this.backendStatus = null
  }

  async initialize() {
    if (this.isInitialized) {
      console.log('✅ [INIT] Already initialized, skipping')
      return Promise.resolve()
    }

    if (this.isInitializing && this.initPromise) {
      console.log('⏳ [INIT] Already initializing, waiting for existing promise')
      return this.initPromise
    }

    this.isInitializing = true
    console.log('🚀 [INIT] Starting KOBI Firewall initialization')

    this.initPromise = new Promise(async (resolve, reject) => {
      try {
        console.log('🔍 [INIT] Checking components...')

        // Component validation
        const components = {
          AuthProvider,
          LoadingSpinner,
          ErrorBoundary,
          Login,
          Dashboard,
          Reports,
          Updates,
          Settings,
          NatSettings, // ✅ NAT Settings component
          DnsManagement,
          RoutesPage,
          RuleGroups,
          InterfaceSettings,
          SecurityRules,
          Logs,
          ProtectedRoute
        }

        const missingComponents = Object.entries(components)
          .filter(([name, component]) => !component)
          .map(([name]) => name)

        if (missingComponents.length > 0) {
          throw new Error(`Missing components: ${missingComponents.join(', ')}`)
        }

        console.log('✅ [INIT] All components loaded successfully')

        // Enhanced Backend connectivity check
        try {
          console.log('🔍 [INIT] Checking KOBI Firewall backend...')
          const controller = new AbortController()
          setTimeout(() => controller.abort(), 5000) // Backend için daha uzun timeout

          const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
          console.log(`🔗 [INIT] Connecting to: ${backendUrl}`)

          // Main health check
          const healthResponse = await fetch(`${backendUrl}/health`, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'X-Client-Type': 'kobi-firewall-frontend',
              'X-Client-Version': '2.0.0'
            },
            signal: controller.signal
          })

          if (healthResponse.ok) {
            const healthData = await healthResponse.json()
            this.backendStatus = {
              connected: true,
              status: healthData.status,
              version: healthData.version,
              features: healthData.features,
              proxy_ready: healthData.proxy_ready,
              timestamp: healthData.timestamp
            }

            console.log('✅ [INIT] Backend connected:', {
              status: healthData.status,
              version: healthData.version,
              proxy_ready: healthData.proxy_ready,
              features: healthData.features?.length || 0
            })

            // NAT module specific check
            if (healthData.features?.network_interface_management) {
              console.log('✅ [INIT] NAT module supported by backend')
            }

            // Settings management check
            if (healthData.features?.settings_management) {
              console.log('✅ [INIT] Settings management supported by backend')
            }

          } else {
            throw new Error(`Backend health check failed: ${healthResponse.status}`)
          }

        } catch (backendError) {
          console.warn('⚠️ [INIT] Backend connection failed (continuing in offline mode):', backendError.message)
          this.backendStatus = {
            connected: false,
            error: backendError.message,
            offline_mode: true
          }
        }

        // Initialize localStorage cleanup
        this.cleanupLocalStorage()

        // UX delay
        await new Promise(resolve => setTimeout(resolve, 500))

        this.isInitialized = true
        this.isInitializing = false
        console.log('✅ [INIT] KOBI Firewall initialization completed successfully')
        resolve()

      } catch (error) {
        this.isInitializing = false
        console.error('❌ [INIT] Initialization failed:', error)
        reject(error)
      }
    })

    return this.initPromise
  }

  cleanupLocalStorage() {
    try {
      // Clear any invalid tokens
      const token = localStorage.getItem('token')
      const tokenExpiry = localStorage.getItem('tokenExpiry')

      if (token && tokenExpiry) {
        const now = Date.now()
        const expiry = parseInt(tokenExpiry)

        if (now >= expiry) {
          console.log('🧹 [INIT] Cleaning expired token')
          localStorage.removeItem('token')
          localStorage.removeItem('tokenExpiry')
          localStorage.removeItem('user')
          localStorage.removeItem('userRole')
        }
      }
    } catch (error) {
      console.warn('⚠️ [INIT] LocalStorage cleanup warning:', error.message)
    }
  }

  getBackendStatus() {
    return this.backendStatus
  }

  reset() {
    console.log('🔄 [INIT] Resetting KOBI Firewall initialization state')
    this.isInitialized = false
    this.isInitializing = false
    this.initPromise = null
    this.backendStatus = null
  }
}

// Global initializer instance
const appInitializer = new AppInitializer()

// Enhanced global reset function
window.resetKobiFirewall = () => {
  console.log('🔄 [APP] Resetting KOBI Firewall application')
  appInitializer.reset()

  // Clear all localStorage
  localStorage.clear()

  // Reload with cache bust
  const url = new URL(window.location)
  url.searchParams.set('_t', Date.now())
  window.location.href = url.toString()
}

// Global backend status check
window.getBackendStatus = () => {
  return appInitializer.getBackendStatus()
}

console.log('📱 [APP] KOBI Firewall App component loaded')

function App() {
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState(null)
  const [backendStatus, setBackendStatus] = useState(null)
  const mountId = useRef(Math.random().toString(36).substr(2, 9))
  const hasInitialized = useRef(false)

  console.log(`📱 [APP] KOBI Firewall App render - Mount ID: ${mountId.current}`)

  // Memoized initialization function
  const initApp = useMemo(() => {
    return async () => {
      if (hasInitialized.current) {
        console.log('🔄 [APP] Init already called for this mount, skipping')
        setIsReady(true)
        return
      }

      hasInitialized.current = true
      console.log(`🚀 [APP] Starting KOBI Firewall initialization for mount ${mountId.current}`)

      try {
        await appInitializer.initialize()
        setBackendStatus(appInitializer.getBackendStatus())
        setIsReady(true)
        console.log(`✅ [APP] Mount ${mountId.current} ready`)
      } catch (initError) {
        console.error(`❌ [APP] Mount ${mountId.current} failed:`, initError)
        setError(initError)
        setIsReady(true)
      }
    }
  }, [])

  useEffect(() => {
    console.log(`🔄 [APP] useEffect triggered for mount ${mountId.current}`)
    initApp()
  }, [initApp])

  useEffect(() => {
    return () => {
      console.log(`🔄 [APP] Mount ${mountId.current} unmounting`)
    }
  }, [])

  // Enhanced Error State
  if (error) {
    console.log('❌ [APP] Error state render')
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        color: 'white',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        textAlign: 'center',
        padding: '20px'
      }}>
        <div style={{ maxWidth: '600px' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔥</div>
          <h1 style={{ color: '#ef4444', marginBottom: '16px', fontSize: '1.5rem' }}>
            KOBI Firewall Başlatma Hatası
          </h1>
          <p style={{ color: '#94a3b8', marginBottom: '24px', lineHeight: '1.5' }}>
            {error.message}
          </p>

          {backendStatus && !backendStatus.connected && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'left'
            }}>
              <h3 style={{ color: '#ef4444', margin: '0 0 8px 0', fontSize: '1rem' }}>
                Backend Bağlantı Sorunu
              </h3>
              <p style={{ color: '#94a3b8', margin: '0', fontSize: '0.875rem' }}>
                Backend server'a bağlanılamıyor. Lütfen backend'in çalışır durumda olduğundan emin olun.
              </p>
            </div>
          )}

          <details style={{
            color: '#64748b',
            fontSize: '12px',
            marginBottom: '24px',
            textAlign: 'left'
          }}>
            <summary style={{ cursor: 'pointer', marginBottom: '10px' }}>
              Debug Bilgileri
            </summary>
            <pre style={{
              background: '#1e293b',
              padding: '10px',
              borderRadius: '4px',
              overflow: 'auto',
              fontSize: '11px'
            }}>
              Mount ID: {mountId.current}{'\n'}
              Error: {error.message}{'\n'}
              Stack: {error.stack}{'\n'}
              Backend Status: {JSON.stringify(backendStatus, null, 2)}
            </pre>
          </details>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                appInitializer.reset()
                window.location.reload()
              }}
              style={{
                background: '#3b82f6',
                color: 'white',
                padding: '12px 24px',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              🔄 Reset ve Yenile
            </button>

            <button
              onClick={() => {
                window.location.href = '/login'
              }}
              style={{
                background: '#64748b',
                color: 'white',
                padding: '12px 24px',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              🏠 Login Sayfasına Git
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Enhanced Loading State
  if (!isReady) {
    console.log(`⏳ [APP] Loading state - Mount ${mountId.current}`)
    return (
      <div style={{ position: 'relative', minHeight: '100vh' }}>
        <LoadingSpinner message="KOBI Firewall başlatılıyor..." />

        {/* Debug info */}
        <div style={{
          position: 'fixed',
          bottom: '10px',
          left: '10px',
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '4px',
          fontSize: '11px',
          fontFamily: 'monospace',
          zIndex: 9999
        }}>
          <div>Mount: {mountId.current}</div>
          <div>Backend: {backendStatus?.connected ? '✅' : '⏳'}</div>
          <div>NAT Ready: {backendStatus?.features?.network_interface_management ? '✅' : '⏳'}</div>
        </div>
      </div>
    )
  }

  console.log(`🎨 [APP] KOBI Firewall main render - Mount ${mountId.current}`)

  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <div className="App">
            {/* Enhanced Debug info */}
            {process.env.NODE_ENV === 'development' && (
              <div style={{
                position: 'fixed',
                top: '10px',
                right: '10px',
                background: 'rgba(0,0,0,0.8)',
                color: 'white',
                padding: '8px 12px',
                borderRadius: '4px',
                fontSize: '11px',
                fontFamily: 'monospace',
                zIndex: 9999,
                minWidth: '200px'
              }}>
                <div>🔥 KOBI Firewall v2.0</div>
                <div>Mount: {mountId.current.substr(0,6)}</div>
                <div>Time: {new Date().toLocaleTimeString()}</div>
                <div>Backend: {backendStatus?.connected ? '✅ Connected' : '❌ Offline'}</div>
                <div>NAT: {backendStatus?.features?.network_interface_management ? '✅' : '❌'}</div>
              </div>
            )}

            {/* Routes - NAT Settings dahil */}
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />

              {/* Protected Routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/logs"
                element={
                  <ProtectedRoute>
                    <Logs />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/reports"
                element={
                  <ProtectedRoute>
                    <Reports />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/updates"
                element={
                  <ProtectedRoute>
                    <Updates />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                }
              />

              {/* 🔥 NAT Settings Route - Enhanced */}
              <Route
                path="/nat-settings"
                element={
                  <ProtectedRoute adminRequired={true}>
                    <NatSettings />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/dns-management"
                element={
                  <ProtectedRoute>
                    <DnsManagement />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/routes"
                element={
                  <ProtectedRoute>
                    <RoutesPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/rule-groups"
                element={
                  <ProtectedRoute>
                    <RuleGroups />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/security-rules"
                element={
                  <ProtectedRoute>
                    <SecurityRules />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/interface-settings"
                element={
                  <ProtectedRoute adminRequired={true}>
                    <InterfaceSettings />
                  </ProtectedRoute>
                }
              />

              {/* Default Routes */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>

            {/* Enhanced Toaster */}
            <Toaster
              position="top-right"
              gutter={8}
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#1e293b',
                  color: '#fff',
                  border: '1px solid #475569',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500'
                },
                success: {
                  style: {
                    border: '1px solid #22c55e',
                    background: 'rgba(34, 197, 94, 0.1)'
                  },
                },
                error: {
                  style: {
                    border: '1px solid #ef4444',
                    background: 'rgba(239, 68, 68, 0.1)'
                  },
                  duration: 6000
                },
                loading: {
                  style: {
                    border: '1px solid #3b82f6',
                    background: 'rgba(59, 130, 246, 0.1)'
                  }
                }
              }}
            />
          </div>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App