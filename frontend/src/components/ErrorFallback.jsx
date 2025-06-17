import React from 'react'
import { FiAlertTriangle, FiRefreshCw } from 'react-icons/fi'

const ErrorFallback = ({ error, resetErrorBoundary }) => {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-gray-800 rounded-lg p-6 text-center">
        <div className="mb-4">
          <FiAlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
        <p className="text-gray-400 mb-4">
          An unexpected error occurred. Please try refreshing the page.
        </p>
        {error && (
          <details className="mb-4 text-left">
            <summary className="text-gray-300 cursor-pointer">Error details</summary>
            <pre className="mt-2 text-xs text-red-400 bg-gray-900 p-2 rounded overflow-auto">
              {error.message}
            </pre>
          </details>
        )}
        <button
          onClick={resetErrorBoundary}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <FiRefreshCw className="h-4 w-4 mr-2" />
          Try again
        </button>
      </div>
    </div>
  )
}

export default ErrorFallback