import React from 'react'

console.log('📄 [LOADING] LoadingSpinner component yüklendi')

const LoadingSpinner = ({ message = 'Yükleniyor...' }) => {
  console.log('📄 [LOADING] LoadingSpinner render:', message)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
      <div className="text-center">
        <div className="relative mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full shadow-2xl">
            <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
          <div className="absolute inset-0 rounded-full border-4 border-blue-500/30 animate-ping"></div>
        </div>
        <div className="flex items-center justify-center space-x-3 mb-4">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
          <span className="text-white text-lg font-medium">{message}</span>
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
        </div>
        <div className="w-48 h-1 bg-slate-700 rounded-full overflow-hidden mx-auto">
          <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full animate-pulse"></div>
        </div>
        <div className="mt-4 text-xs text-gray-400">
          Debug: {new Date().toLocaleTimeString()}
        </div>
      </div>
    </div>
  )
}

export default LoadingSpinner