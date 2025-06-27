import React from 'react'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    console.error('🚨 ErrorBoundary caught error:', error)
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    console.error('🚨 ErrorBoundary details:', error, errorInfo)
    this.setState({ error })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-8">
            <div className="text-red-400 text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-white mb-2">Bir Hata Oluştu</h1>
            <p className="text-gray-400 mb-4">
              Uygulama beklenmedik bir hatayla karşılaştı.
            </p>
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-4 text-left">
              <h3 className="text-red-300 font-semibold mb-2">Hata:</h3>
              <pre className="text-xs text-red-200 whitespace-pre-wrap">
                {this.state.error?.toString()}
              </pre>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg mx-auto transition-colors"
            >
              <span>🔄 Sayfayı Yenile</span>
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary