import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { authService } from '../services/authService'
import { io } from 'socket.io-client'
import toast from 'react-hot-toast'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('cr_user')) || null
    } catch {
      return null
    }
  })
  const [token, setToken] = useState(() => localStorage.getItem('cr_token') || null)
  const [bootstrapping, setBootstrapping] = useState(true)
  const [loading, setLoading] = useState(false)
  const [notifications, setNotifications] = useState([])

  const persist = (nextToken, nextUser) => {
    setToken(nextToken)
    setUser(nextUser)
    localStorage.setItem('cr_token', nextToken)
    localStorage.setItem('cr_user', JSON.stringify(nextUser))
  }

  const clearSession = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('cr_token')
    localStorage.removeItem('cr_user')
  }

  const refreshUser = async () => {
    const res = await authService.getMe()
    setUser(res.data.user)
    localStorage.setItem('cr_user', JSON.stringify(res.data.user))
    return res.data.user
  }

  const login = async (credentials) => {
    setLoading(true)
    try {
      const res = await authService.login(credentials)
      persist(res.data.token, res.data.user)
      return { success: true, user: res.data.user }
    } catch (err) {
      const backendMessage = err.response?.data?.message
      const status = err.response?.status

      if (status === 503) {
        return {
          success: false,
          message: 'Database is unavailable. Please start MongoDB, restart backend, then try again.',
        }
      }

      if (backendMessage === 'Server error during login.') {
        return {
          success: false,
          message: 'Login service is running in degraded mode. Start MongoDB and restart backend server.',
        }
      }

      return { success: false, message: backendMessage || 'Login failed.' }
    } finally {
      setLoading(false)
    }
  }

  const register = async (payload) => {
    setLoading(true)
    try {
      const res = await authService.register(payload)
      persist(res.data.token, res.data.user)
      return { success: true, user: res.data.user }
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Registration failed.',
        errors: err.response?.data?.errors || [],
      }
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      await authService.logout()
    } catch {
      // no-op
    } finally {
      clearSession()
    }
  }

  useEffect(() => {
    const onAuthExpired = () => clearSession()
    window.addEventListener('auth:expired', onAuthExpired)
    return () => window.removeEventListener('auth:expired', onAuthExpired)
  }, [])

  useEffect(() => {
    const bootstrap = async () => {
      if (!token) {
        setBootstrapping(false)
        return
      }

      try {
        await refreshUser()
      } catch {
        clearSession()
      } finally {
        setBootstrapping(false)
      }
    }

    bootstrap()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!token) return undefined

    const socket = io('/', {
      auth: { token },
      transports: ['websocket', 'polling'],
    })

    socket.on('connect', () => {
      socket.emit('join-user-room')
    })

    socket.on('notification', (payload) => {
      setNotifications((prev) => [payload, ...prev].slice(0, 100))
      toast(payload?.message || 'New platform notification', { icon: '🔔' })
    })

    socket.on('stream:started', (payload) => {
      const streamId = payload?.streamId || payload?.roomId
      if (!streamId) return

      const starterName = payload?.startedBy?.name || 'A user'
      const title = payload?.title || 'Live stream'

      setNotifications((prev) => [{
        type: 'stream_started',
        message: `${starterName} is now live: ${title}`,
        payload,
        createdAt: new Date().toISOString(),
      }, ...prev].slice(0, 100))

      toast.custom((t) => (
        <div className="max-w-sm rounded-xl border border-indigo-200 bg-white px-4 py-3 shadow-lg">
          <p className="text-sm font-semibold text-slate-900">{starterName} started a live stream</p>
          <p className="text-xs text-slate-600 mt-1 truncate">{title}</p>
          <button
            type="button"
            className="mt-3 inline-flex items-center rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
            onClick={() => {
              toast.dismiss(t.id)
              window.location.assign(`/live/${streamId}`)
            }}
          >
            Join Live
          </button>
        </div>
      ), { duration: 10000 })
    })

    socket.on('stream:ended', (payload) => {
      const streamId = payload?.streamId || payload?.roomId
      if (!streamId) return

      setNotifications((prev) => [{
        type: 'stream_ended',
        message: `A live stream has ended (${streamId}).`,
        payload,
        createdAt: new Date().toISOString(),
      }, ...prev].slice(0, 100))
    })

    return () => {
      socket.disconnect()
    }
  }, [token])

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      bootstrapping,
      isAdmin: user?.role === 'admin',
      isAuthenticated: !!token,
      verified: user?.idVerificationStatus === 'verified',
      login,
      register,
      logout,
      refreshUser,
      clearSession,
      notifications,
    }),
    [user, token, loading, bootstrapping, notifications]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
