import React, { ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null
    }
  }

  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🔴 ErrorBoundary caught an error:', error)
    console.error('Error details:', errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
            <h1 className="text-2xl font-bold text-red-600 mb-4">⚠️ Error</h1>
            <p className="text-gray-700 mb-4">
              Se produjo un error al cargar la página. Por favor, intenta recargar.
            </p>
            <div className="bg-red-50 border border-red-200 rounded p-4 mb-6 overflow-auto max-h-32">
              <p className="text-sm text-red-600 font-mono break-all">
                {this.state.error?.message || 'Unknown error'}
              </p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
            >
              Recargar página
            </button>
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="w-full bg-gray-200 text-gray-800 py-2 rounded hover:bg-gray-300 transition mt-2"
            >
              Ir al Dashboard
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
