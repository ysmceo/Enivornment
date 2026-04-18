import { Navigate, Route, Routes } from 'react-router-dom'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Preview from './pages/Preview'
import CitizenDashboard from './pages/CitizenDashboard'
import AdminDashboard from './pages/AdminDashboard'
import AdminReports from './pages/AdminReports'
import AdminUsers from './pages/AdminUsers'
import AdminVerification from './pages/AdminVerification'
import EmergencyDirectoryPage from './pages/EmergencyDirectoryPage'
import LiveHomePage from './pages/LiveHomePage.jsx'
import AdminLiveViewerPage from './pages/AdminLiveViewerPage.jsx'
import NewsCategoryPage from './pages/NewsCategoryPage.jsx'
import NewsReaderPage from './pages/NewsReaderPage.jsx'
import SOSPage from './pages/SOSPage.jsx'
import CrimeAnalytics from './pages/CrimeAnalytics.jsx'
import ProtectedRoute from './components/ProtectedRoute'

export default function App() {
  return (
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
          <ProtectedRoute role="user">
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
  )
}

