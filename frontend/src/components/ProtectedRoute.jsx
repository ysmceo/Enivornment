import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { PageLoader } from './LoadingSpinner'

export default function ProtectedRoute({ children, role, verified = false }) {
  const { user, bootstrapping } = useAuth()
  const location = useLocation()

  if (bootstrapping) return <PageLoader />

  if (!user) return <Navigate to="/login" replace state={{ from: location }} />

  if (role && user.role !== role) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />
  }

  if (verified && user.idVerificationStatus !== 'verified') {
    return <Navigate to="/dashboard" replace />
  }

  return children
}
