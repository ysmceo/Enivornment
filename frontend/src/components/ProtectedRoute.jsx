import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { PageLoader } from './LoadingSpinner'

const getHomeRouteByRole = (userRole) => {
  if (userRole === 'admin') return '/admin'
  return '/dashboard'
}

const hasRequiredRole = (userRole, requiredRole) => {
  if (!requiredRole) return true
  if (Array.isArray(requiredRole)) return requiredRole.includes(userRole)
  return userRole === requiredRole
}

export default function ProtectedRoute({ children, role, verified = false }) {
  const { user, bootstrapping } = useAuth()
  const location = useLocation()

  if (bootstrapping) return <PageLoader />

  if (!user) return <Navigate to="/login" replace state={{ from: location }} />

  if (!hasRequiredRole(user.role, role)) {
    const fallbackRoute = getHomeRouteByRole(user.role)
    if (location.pathname === fallbackRoute) {
      return <Navigate to="/" replace />
    }
    return <Navigate to={fallbackRoute} replace />
  }

  if (verified && user.idVerificationStatus !== 'verified') {
    return <Navigate to="/dashboard" replace />
  }

  return children
}
