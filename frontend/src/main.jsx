import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Detaylı hata yakalama ve debug sistemi
console.log('🚀 [MAIN] React uygulaması başlatılıyor...')
console.log('🚀 [MAIN] Environment:', {
  NODE_ENV: import.meta.env.NODE_ENV,
  DEV: import.meta.env.DEV,
  PROD: import.meta.env.PROD,
  BASE_URL: import.meta.env.BASE_URL,
  VITE_API_URL: import.meta.env.VITE_API_URL
})

// Global error handler - detaylı hata yakalama
window.addEventListener('error', (event) => {
  console.error('🚨 [GLOBAL ERROR]:', event.error)
  console.error('🚨 [ERROR DETAILS]:', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    stack: event.error?.stack
  })
})

// Promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  console.error('🚨 [UNHANDLED PROMISE REJECTION]:', event.reason)
  console.error('🚨 [PROMISE ERROR DETAILS]:', event)
})

// React error boundary fallback
const ErrorFallback = ({ error, errorInfo }) => {
  console.error('🚨 [REACT ERROR BOUNDARY]:', error)
  console.error('🚨 [ERROR INFO]:', errorInfo)

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
      <div>
        <h1 style={{ color: '#ef4444', marginBottom: '16px', fontSize: '24px' }}>
          React Hatası Tespit Edildi
        </h1>
        <p style={{ color: '#94a3b8', marginBottom: '24px' }}>
          Konsolu kontrol edin ve sayfayı yenileyin
        </p>
        <div style={{
          background: '#1e293b',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '24px',
          textAlign: 'left',
          fontSize: '12px',
          fontFamily: 'monospace',
          border: '1px solid #475569'
        }}>
          <div style={{ color: '#ef4444', marginBottom: '8px' }}>Error:</div>
          <div style={{ color: '#f8fafc' }}>{error.toString()}</div>
          {error.stack && (
            <>
              <div style={{ color: '#ef4444', marginTop: '12px', marginBottom: '8px' }}>Stack:</div>
              <div style={{ color: '#94a3b8', fontSize: '10px' }}>
                {error.stack.split('\n').slice(0, 5).join('\n')}
              </div>
            </>
          )}
        </div>
        <button
          onClick={() => window.location.reload()}
          style={{
            background: '#3b82f6',
            color: 'white',
            padding: '12px 24px',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Sayfayı Yenile
        </button>
      </div>
    </div>
  )
}

try {
  console.log('🔍 [MAIN] DOM root elementi aranıyor...')
  const rootElement = document.getElementById('root')

  if (!rootElement) {
    throw new Error('Root element bulunamadı! index.html dosyasında <div id="root"></div> var mı?')
  }

  console.log('✅ [MAIN] Root element bulundu:', rootElement)

  console.log('🔍 [MAIN] ReactDOM.createRoot çağrılıyor...')
  const root = ReactDOM.createRoot(rootElement)

  console.log('✅ [MAIN] Root oluşturuldu, App component render ediliyor...')
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )

  console.log('✅ [MAIN] React uygulaması başarıyla başlatıldı')
} catch (error) {
  console.error('❌ [MAIN] FATAL ERROR:', error)
  console.error('❌ [MAIN] Error type:', typeof error)
  console.error('❌ [MAIN] Error name:', error.name)
  console.error('❌ [MAIN] Error message:', error.message)
  console.error('❌ [MAIN] Error stack:', error.stack)

  // Fallback render
  try {
    document.getElementById('root').innerHTML = `
      <div style="
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
        color: white;
        font-family: system-ui, -apple-system, sans-serif;
        text-align: center;
        padding: 20px;
      ">
        <div>
          <h1 style="color: #ef4444; margin-bottom: 16px; font-size: 24px;">
            Kritik Başlatma Hatası
          </h1>
          <p style="color: #94a3b8; margin-bottom: 24px;">
            React uygulaması başlatılamadı
          </p>
          <div style="
            background: #1e293b;
            padding: 16px;
            border-radius: 8px;
            margin-bottom: 24px;
            text-align: left;
            font-size: 12px;
            font-family: monospace;
            border: 1px solid #475569;
          ">
            <div style="color: #ef4444; margin-bottom: 8px;">Error:</div>
            <div style="color: #f8fafc;">${error.message}</div>
            <div style="color: #94a3b8; margin-top: 8px; font-size: 10px;">
              Type: ${error.name || 'Unknown'}
            </div>
          </div>
          <button onclick="window.location.reload()" style="
            background: #3b82f6;
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
          ">
            Sayfayı Yenile
          </button>
          <div style="margin-top: 16px; font-size: 12px; color: #64748b;">
            F12 tuşuna basıp konsolu kontrol edin
          </div>
        </div>
      </div>`
  } catch (fallbackError) {
    console.error('❌ [MAIN] Fallback render da başarısız:', fallbackError)
  }
}