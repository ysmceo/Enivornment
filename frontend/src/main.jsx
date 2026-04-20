import React, { Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, UNSAFE_FutureConfig } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import AppErrorBoundary from './components/AppErrorBoundary'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import { LanguageProvider } from './context/LanguageContext'
import './index.css'
import 'leaflet/dist/leaflet.css'

const futureConfig = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter future={futureConfig} basename={import.meta.env.BASE_URL || '/'}>
      <LanguageProvider>
        <ThemeProvider>
          <AuthProvider>
            <AppErrorBoundary>
              <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-slate-500">Loading app…</div>}>
                <App />
              </Suspense>
              <Toaster position="top-right" />
            </AppErrorBoundary>
          </AuthProvider>
        </ThemeProvider>
      </LanguageProvider>
    </BrowserRouter>
  </React.StrictMode>
)
