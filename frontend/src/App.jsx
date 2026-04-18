import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'

const Landing = lazy(() => import('./pages/Landing'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const Preview = lazy(() => import('./pages/Preview'))
const CitizenDashboard = lazy(() => import('./pages/CitizenDashboard'))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
const AdminReports = lazy(() => import('./pages/AdminReports'))
const AdminUsers = lazy(() => import('./pages/AdminUsers'))
const AdminVerification = lazy(() => import('./pages/AdminVerification'))
const AdminEmergencyContacts = lazy(() => import('./pages/AdminEmergencyContacts.jsx'))
const EmergencyDirectoryPage = lazy(() => import('./pages/EmergencyDirectoryPageV2'))
const LiveHomePage = lazy(() => import('./pages/LiveHomePage.jsx'))
const AdminLiveViewerPage = lazy(() => import('./pages/AdminLiveViewerPage.jsx'))
const NewsCategoryPage = lazy(() => import('./pages/NewsCategoryPage.jsx'))
const NewsReaderPage = lazy(() => import('./pages/NewsReaderPage.jsx'))
const SOSPage = lazy(() => import('./pages/SOSPage.jsx'))
const CrimeAnalytics = lazy(() => import('./pages/CrimeAnalytics.jsx'))

const RouteFallback = () => (
  <main className="max-w-5xl mx-auto p-6">
    <div className="card p-6 text-sm text-slate-500">Loading page…</div>
  </main>
)

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
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
            <ProtectedRoute role="user" verified>
              <LiveHomePage />
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
    </Suspense>
  )
}

