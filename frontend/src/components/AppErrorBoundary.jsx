import React from 'react'

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    // Keep a visible console trail for debugging blank-page issues
    // eslint-disable-next-line no-console
    console.error('[AppErrorBoundary] Runtime error:', error, errorInfo)
  }

  handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 grid place-items-center p-6">
          <section className="card max-w-2xl w-full p-6 space-y-4 border border-red-300/60 dark:border-red-700/60">
            <h1 className="text-xl font-bold text-red-700 dark:text-red-300">Something went wrong while rendering this page.</h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              This prevents a blank screen so you can see the issue. You can refresh now, and if it continues, share the error details below.
            </p>
            <div className="rounded-lg bg-slate-100 dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700">
              <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Error details</p>
              <pre className="text-xs whitespace-pre-wrap break-words text-red-700 dark:text-red-300">
                {String(this.state.error?.stack || this.state.error?.message || this.state.error || 'Unknown runtime error')}
              </pre>
            </div>
            <div className="flex gap-2">
              <button type="button" className="btn-primary" onClick={this.handleReload}>Reload page</button>
            </div>
          </section>
        </main>
      )
    }

    return this.props.children
  }
}
