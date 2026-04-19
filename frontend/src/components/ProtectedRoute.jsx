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

const getAgeFromDate = (dateInput) => {
  if (!dateInput) return null
  const dob = new Date(dateInput)
  if (Number.isNaN(dob.getTime())) return null

  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const monthDiff = today.getMonth() - dob.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1
  }

  return age
}

const isAdultAccount = (user) => {
  const age = getAgeFromDate(user?.dateOfBirth)
  if (typeof age === 'number') return age >= 18
  return user?.isAdult !== false
}

export default function ProtectedRoute({ children, role, verified = false, adultOnly = false }) {
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

  if (adultOnly && user?.role !== 'admin' && !isAdultAccount(user)) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}
