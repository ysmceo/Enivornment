import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'

const lazyWithReload = (importer) =>
  lazy(() =>
    importer().catch((err) => {
      const message = String(err?.message || '')
      const isChunkLoadError =
        message.includes('Failed to fetch dynamically imported module') ||
        message.includes('Importing a module script failed')

      if (isChunkLoadError && typeof window !== 'undefined') {
        window.location.reload()
      }

      throw err
    })
  )

const Landing = lazyWithReload(() => import('./pages/Landing'))
const Login = lazyWithReload(() => import('./pages/Login'))
const Register = lazyWithReload(() => import('./pages/Register'))
const ForgotPassword = lazyWithReload(() => import('./pages/ForgotPassword'))
const ResetPassword = lazyWithReload(() => import('./pages/ResetPassword'))
const Preview = lazyWithReload(() => import('./pages/Preview'))
const CitizenDashboard = lazyWithReload(() => import('./pages/CitizenDashboard'))
const AdminDashboard = lazyWithReload(() => import('./pages/AdminDashboard'))
const AdminReports = lazyWithReload(() => import('./pages/AdminReports'))
const AdminUsers = lazyWithReload(() => import('./pages/AdminUsers'))
const AdminVerification = lazyWithReload(() => import('./pages/AdminVerification'))
const AdminEmergencyContacts = lazyWithReload(() => import('./pages/AdminEmergencyContacts.jsx'))
const EmergencyDirectoryPage = lazyWithReload(() => import('./pages/EmergencyDirectoryPageV2'))
const LiveHomePage = lazyWithReload(() => import('./pages/LiveHomePage.jsx'))
const LiveStartPage = lazyWithReload(() => import('./pages/LiveStartPage.jsx'))
const LiveViewerPage = lazyWithReload(() => import('./pages/LiveViewerPage.jsx'))
const AdminLiveViewerPage = lazyWithReload(() => import('./pages/AdminLiveViewerPage.jsx'))
const NewsCategoryPage = lazyWithReload(() => import('./pages/NewsCategoryPage.jsx'))
const NewsReaderPage = lazyWithReload(() => import('./pages/NewsReaderPage.jsx'))
const SOSPage = lazyWithReload(() => import('./pages/SOSPage.jsx'))
const CrimeAnalytics = lazyWithReload(() => import('./pages/CrimeAnalytics.jsx'))

const RouteFallback = () => (
  <main className="max-w-5xl mx-auto p-6">
    <div className="card p-6 text-sm text-slate-500">Loading page…</div>
  </main>
)

export default function App() {
  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <Suspense fallback={<RouteFallback />}>
        <div id="main-content" tabIndex={-1}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/preview" element={<Preview />} />
            <Route path="/news" element={<Navigate to="/news/all" replace />} />
            <Route path="/news/:category" element={<NewsCategoryPage />} />
            <Route path="/news/read" element={<NewsReaderPage />} />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute role={["user", "authority"]}>
                  <CitizenDashboard />
                </ProtectedRoute>
              }
            />

          <Route path="/emergency" element={<EmergencyDirectoryPage />} />

            <Route
              path="/sos"
              element={
                <ProtectedRoute verified>
                  <SOSPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin"
              element={
                <ProtectedRoute role="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/reports"
              element={
                <ProtectedRoute role="admin">
                  <AdminReports />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute role="admin">
                  <AdminUsers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/verification"
              element={
                <ProtectedRoute role="admin">
                  <AdminVerification />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/emergency-contacts"
              element={
                <ProtectedRoute role="admin">
                  <AdminEmergencyContacts />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analytics"
              element={
                <ProtectedRoute role="admin">
                  <CrimeAnalytics />
                </ProtectedRoute>
              }
            />

            <Route
              path="/live"
              element={
                <ProtectedRoute>
                  <LiveHomePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/live/start"
              element={
                <ProtectedRoute role="user">
                  <LiveStartPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/live/:streamId"
              element={
                <ProtectedRoute>
                  <LiveViewerPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/live"
              element={
                <ProtectedRoute role="admin">
                  <AdminLiveViewerPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/live/:streamId"
              element={
                <ProtectedRoute role="admin">
                  <AdminLiveViewerPage />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Suspense>
    </>
  )
}

