import { useCallback, useEffect, useRef, useState } from 'react'
import { FileWarning, ShieldCheck, Users, Clock, Star, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import AdminSidebar from '../components/AdminSidebar'
import ThemeToggle from '../components/ThemeToggle'
import StatsCard from '../components/StatsCard'
import Badge from '../components/Badge'
import LoadingSpinner from '../components/LoadingSpinner'
import { reportService, userService } from '../services/reportService'
import { platformService } from '../services/platformService'
import { useSocket } from '../hooks/useSocket'

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

const isUsableGoogleMapsKey = (value) => {
  const normalized = String(value || '').trim().toLowerCase()
  if (!normalized) return false

  const placeholderPatterns = [
    'replace',
    'your_',
    'example',
    'placeholder',
    'optional',
    'dummy',
    'test',
  ]

  return !placeholderPatterns.some((pattern) => normalized.includes(pattern))
}

const buildHealthChecks = (configHealth) => {
  const hasUsableMapsKey = isUsableGoogleMapsKey(GOOGLE_MAPS_API_KEY)

  const checks = [
    {
      key: 'database',
      label: 'Database',
      healthy: Boolean(configHealth?.database?.connected),
      okStatus: 'active',
      badStatus: 'degraded',
      envFile: 'backend/.env',
      envKeys: ['MONGO_URI'],
      fix: 'Set a valid MongoDB URI and ensure MongoDB service is running before restarting backend.',
    },
    {
      key: 'cloudinary',
      label: 'Cloudinary Upload',
      healthy: Boolean(configHealth?.cloudinary?.configured),
      okStatus: 'configured',
      badStatus: 'unconfigured',
      envFile: 'backend/.env',
      envKeys: ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'],
      fix: 'Replace placeholder Cloudinary values with real credentials from your Cloudinary dashboard.',
    },
    {
      key: 'maps',
      label: 'Browser Maps Key',
      healthy: true,
      okStatus: hasUsableMapsKey ? 'configured' : 'fallback',
      badStatus: 'fallback',
      envFile: 'frontend/.env',
      envKeys: ['VITE_GOOGLE_MAPS_API_KEY'],
      fix: 'Set a valid browser Google Maps key, or keep fallback mode to use OpenStreetMap geocoding.',
    },
    {
      key: 'jwt',
      label: 'JWT Secret',
      healthy: Boolean(configHealth?.auth?.jwtConfigured),
      okStatus: 'configured',
      badStatus: 'unconfigured',
      envFile: 'backend/.env',
      envKeys: ['JWT_SECRET'],
      fix: 'Use a long random JWT secret for secure token signing, then restart backend.',
    },
  ]

  return checks
}

const formatLoadIssue = (label, result) => {
  if (result?.status !== 'rejected') return label

  const status = Number(result?.reason?.response?.status || 0)

  if (label === 'audit trail' && (status === 401 || status === 403)) {
    return 'audit trail (admin session expired — sign in again)'
  }

  if (status === 401 || status === 403) {
    return `${label} (authentication required)`
  }

  if (status >= 500) {
    return `${label} (server unavailable)`
  }

  return label
}

export default function AdminDashboard() {
  const { on } = useSocket()
  const [stats, setStats] = useState(null)
  const [recentReports, setRecentReports] = useState([])
  const [auditLogs, setAuditLogs] = useState([])
  const [auditUnavailableMessage, setAuditUnavailableMessage] = useState('')
  const [mapSummary, setMapSummary] = useState(null)
  const [configHealth, setConfigHealth] = useState(null)
  const [adminNotifications, setAdminNotifications] = useState([])
  const [unreadAlertCount, setUnreadAlertCount] = useState(0)
  const [markingReadId, setMarkingReadId] = useState('')
  const [markingAllRead, setMarkingAllRead] = useState(false)
  const [loadIssues, setLoadIssues] = useState([])
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const refreshInFlightRef = useRef(false)
  const realtimePulseTimeoutRef = useRef(null)
  const realtimePopoverRef = useRef(null)
  const realtimeToggleButtonRef = useRef(null)
  const [avatarErrors, setAvatarErrors] = useState({})
  const [isLiveSyncPulse, setIsLiveSyncPulse] = useState(false)
  const [lastRealtimeSignalAt, setLastRealtimeSignalAt] = useState(null)
  const [showRealtimeEvents, setShowRealtimeEvents] = useState(false)
  const [recentRealtimeEvents, setRecentRealtimeEvents] = useState([])

  const markAvatarError = (key) => {
    setAvatarErrors((prev) => ({ ...prev, [key]: true }))
  }

  const getInitials = (name = '') => {
    const tokens = String(name || '').trim().split(/\s+/).filter(Boolean)
    if (!tokens.length) return 'A'
    return tokens.slice(0, 2).map((token) => token[0]?.toUpperCase() || '').join('')
  }

  const trendDirection = stats?.journeyRatingTrend?.direction || 'flat'
  const trendValue = Number(stats?.journeyRatingTrend?.change || 0)
  const trendPct = Number(stats?.journeyRatingTrend?.changePct || 0)
  const trendColor =
    trendDirection === 'up'
      ? 'text-emerald-600 dark:text-emerald-400'
      : trendDirection === 'down'
        ? 'text-rose-600 dark:text-rose-400'
        : 'text-slate-500 dark:text-slate-400'

  const healthChecks = buildHealthChecks(configHealth)
  const failingChecks = healthChecks.filter((item) => !item.healthy)

  const formatWeeklyTrend = (value) => {
    const numeric = Number(value || 0)
    const rounded = Math.round(Math.abs(numeric))
    if (numeric > 0) return `● +${rounded}% this week`
    if (numeric < 0) return `● -${rounded}% this week`
    return '● 0% this week'
  }

  const getWeeklyTrendClass = (direction) => {
    if (direction === 'up') return 'text-emerald-600 dark:text-emerald-400 font-semibold'
    if (direction === 'down') return 'text-rose-600 dark:text-rose-400 font-semibold'
    return 'text-slate-500 dark:text-slate-400 font-semibold'
  }

  const load = useCallback(async ({ silent = false, manual = false } = {}) => {
    if (refreshInFlightRef.current) return
    refreshInFlightRef.current = true

    try {
      if (manual) setIsRefreshing(true)
      if (!silent) setLoading(true)

      const [statsRes, reportsRes, auditRes, mapRes, healthRes, notifRes] = await Promise.allSettled([
        reportService.getAdminStats(),
        reportService.adminGetAllReports({ limit: 8 }),
        userService.getAuditLogs({ limit: 6 }),
        reportService.getMapSummary(),
        platformService.getConfigHealth(),
        userService.getAdminNotifications({ limit: 8 }),
      ])

      const failed = []

      if (statsRes.status === 'fulfilled') setStats(statsRes.value?.data?.stats || null)
      else failed.push(formatLoadIssue('overview stats', statsRes))

      if (reportsRes.status === 'fulfilled') setRecentReports(reportsRes.value?.data?.reports || [])
      else failed.push(formatLoadIssue('latest reports', reportsRes))

      if (auditRes.status === 'fulfilled') {
        setAuditLogs(auditRes.value?.data?.logs || [])
        setAuditUnavailableMessage('')
      } else {
        setAuditLogs([])
        const auditIssue = formatLoadIssue('audit trail', auditRes)
          .replace(/^audit trail\s*/i, '')
          .trim()
        setAuditUnavailableMessage(auditIssue || 'temporarily unavailable')
      }

      if (mapRes.status === 'fulfilled') setMapSummary(mapRes.value?.data?.summary || null)
      else failed.push(formatLoadIssue('map summary', mapRes))

      if (healthRes.status === 'fulfilled') setConfigHealth(healthRes.value?.data?.configHealth || null)
      else failed.push(formatLoadIssue('config health', healthRes))

      if (notifRes.status === 'fulfilled') {
        setAdminNotifications(notifRes.value?.data?.notifications || [])
        setUnreadAlertCount(Number(notifRes.value?.data?.unreadCount || 0))
      } else {
        failed.push(formatLoadIssue('admin alerts', notifRes))
      }

      setLoadIssues(failed)
      setLastRefreshedAt(new Date().toISOString())
    } finally {
      refreshInFlightRef.current = false
      if (manual) setIsRefreshing(false)
      if (!silent) setLoading(false)
    }
  }, [])

  const triggerRealtimeSync = useCallback((label, payload = null) => {
    const occurredAt = new Date().toISOString()
    const payloadReason = String(payload?.reason || payload?.message || '').trim()
    const reason = payloadReason || label

    setLastRealtimeSignalAt(occurredAt)
    setIsLiveSyncPulse(true)
    setRecentRealtimeEvents((prev) => {
      const next = [
        {
          id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          label,
          reason,
          at: occurredAt,
        },
        ...prev,
      ]
      return next.slice(0, 8)
    })

    if (realtimePulseTimeoutRef.current) {
      clearTimeout(realtimePulseTimeoutRef.current)
    }

    realtimePulseTimeoutRef.current = setTimeout(() => {
      setIsLiveSyncPulse(false)
    }, 2200)

    load({ silent: true }).catch(() => {})
  }, [load])

  useEffect(() => {
    load().catch(() => setLoading(false))
  }, [load])

  useEffect(() => {
    const interval = setInterval(() => {
      load({ silent: true }).catch(() => {})
    }, 15000)

    const handleFocus = () => {
      load({ silent: true }).catch(() => {})
    }

    window.addEventListener('focus', handleFocus)

    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', handleFocus)
    }
  }, [load])

  useEffect(() => {
    const offNotification = on('notification', (payload) => triggerRealtimeSync('notification', payload))
    const offStatusUpdate = on('report-status-update', (payload) => triggerRealtimeSync('report status update', payload))
    const offOverviewUpdated = on('admin:overview-updated', (payload) => triggerRealtimeSync('admin overview updated', payload))
    const offStreamStarted = on('stream:started', (payload) => triggerRealtimeSync('stream started', payload))
    const offStreamEnded = on('stream:ended', (payload) => triggerRealtimeSync('stream ended', payload))

    return () => {
      offNotification?.()
      offStatusUpdate?.()
      offOverviewUpdated?.()
      offStreamStarted?.()
      offStreamEnded?.()
    }
  }, [on, triggerRealtimeSync])

  useEffect(() => {
    return () => {
      if (realtimePulseTimeoutRef.current) {
        clearTimeout(realtimePulseTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!showRealtimeEvents) return undefined

    const handleDocumentMouseDown = (event) => {
      const target = event.target

      if (realtimePopoverRef.current?.contains(target)) return
      if (realtimeToggleButtonRef.current?.contains(target)) return

      setShowRealtimeEvents(false)
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setShowRealtimeEvents(false)
      }
    }

    document.addEventListener('mousedown', handleDocumentMouseDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handleDocumentMouseDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [showRealtimeEvents])

  const markAlertRead = useCallback(async (notificationId) => {
    if (!notificationId) return
    setMarkingReadId(notificationId)
    try {
      await userService.markAdminNotificationRead(notificationId)
      setAdminNotifications((prev) => prev.map((item) => (
        item._id === notificationId ? { ...item, readAt: item.readAt || new Date().toISOString() } : item
      )))
      setUnreadAlertCount((prev) => Math.max(Number(prev || 0) - 1, 0))
    } finally {
      setMarkingReadId('')
    }
  }, [])

  const markAllAlertsRead = useCallback(async () => {
    if (markingAllRead || unreadAlertCount <= 0) return
    setMarkingAllRead(true)
    try {
      await userService.markAllAdminNotificationsRead()
      setAdminNotifications((prev) => prev.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() })))
      setUnreadAlertCount(0)
    } finally {
      setMarkingAllRead(false)
    }
  }, [markingAllRead, unreadAlertCount])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <LoadingSpinner size="lg" label="Loading admin dashboard..." />
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-indigo-50/50 to-violet-50/50 dark:from-slate-900 dark:via-indigo-950/20 dark:to-violet-950/20 font-sans">
      <AdminSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-gradient-to-r from-white to-indigo-50/70 dark:from-slate-900 dark:to-indigo-950/20 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6">
          <div>
            <h1 className="text-base font-extrabold bg-gradient-to-r from-indigo-700 to-violet-700 dark:from-indigo-300 dark:to-violet-300 bg-clip-text text-transparent">Admin Overview</h1>
            <p className="text-xs text-slate-600 dark:text-slate-400">Central moderation dashboard</p>
            <div className="mt-1 relative inline-block">
              <button
                type="button"
                onClick={() => setShowRealtimeEvents((prev) => !prev)}
                className="inline-flex items-center gap-2 rounded-full border border-emerald-200/70 dark:border-emerald-800/70 bg-emerald-50/80 dark:bg-emerald-900/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300"
                aria-expanded={showRealtimeEvents}
                aria-label="Toggle live sync event log"
                ref={realtimeToggleButtonRef}
              >
                <span className="relative flex h-2 w-2">
                  <span className={`absolute inline-flex h-full w-full rounded-full bg-emerald-400 ${isLiveSyncPulse ? 'animate-ping opacity-80' : 'opacity-0'}`} />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                {isLiveSyncPulse ? 'Live sync active' : 'Live sync ready'}
                {lastRealtimeSignalAt && (
                  <span className="text-[10px] text-emerald-600/90 dark:text-emerald-400/90">
                    · Last event {new Date(lastRealtimeSignalAt).toLocaleTimeString()}
                  </span>
                )}
              </button>

              {showRealtimeEvents && (
                <div
                  className="absolute z-20 mt-1 w-[320px] max-w-[85vw] rounded-xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 shadow-xl backdrop-blur p-3"
                  ref={realtimePopoverRef}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Recent realtime events</p>
                    <button
                      type="button"
                      onClick={() => setShowRealtimeEvents(false)}
                      className="text-[10px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    >
                      Close
                    </button>
                  </div>

                  {recentRealtimeEvents.length === 0 ? (
                    <p className="text-[11px] text-slate-500">Waiting for first socket event…</p>
                  ) : (
                    <ul className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {recentRealtimeEvents.map((eventItem) => (
                        <li key={eventItem.id} className="rounded-lg border border-slate-200/70 dark:border-slate-700/70 bg-slate-50/60 dark:bg-slate-800/60 px-2.5 py-2">
                          <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 capitalize">{eventItem.label}</p>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400">{eventItem.reason}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">{new Date(eventItem.at).toLocaleTimeString()}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => load({ silent: true, manual: true }).catch(() => {})}
              disabled={isRefreshing}
              className={`btn-secondary text-xs inline-flex items-center gap-1 ${isRefreshing ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 space-y-5">
          <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/40 px-4 py-2 text-xs text-slate-500 dark:text-slate-400">
            Last refreshed: {lastRefreshedAt ? new Date(lastRefreshedAt).toLocaleTimeString() : 'Waiting for first sync...'}
          </section>

          <section className="card p-4 border border-indigo-300/30 bg-gradient-to-r from-indigo-500/10 via-transparent to-cyan-500/10">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Admin Alerts</h2>
                <p className="text-xs text-slate-500">Unread: <span className="font-semibold text-indigo-600 dark:text-indigo-300">{unreadAlertCount}</span></p>
              </div>
              <button
                type="button"
                onClick={() => markAllAlertsRead().catch(() => {})}
                disabled={markingAllRead || unreadAlertCount <= 0}
                className={`btn-secondary text-xs ${markingAllRead || unreadAlertCount <= 0 ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                {markingAllRead ? 'Marking…' : 'Mark all read'}
              </button>
            </div>

            <div className="space-y-2">
              {adminNotifications.length === 0 ? (
                <p className="text-xs text-slate-500">No admin alerts yet.</p>
              ) : (
                adminNotifications.map((item) => (
                  <div key={item._id} className={`rounded-lg border px-3 py-2 ${item.readAt ? 'border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/40' : 'border-indigo-300/60 dark:border-indigo-700/70 bg-indigo-50/60 dark:bg-indigo-900/20'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{item.title}</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 break-words">{item.message}</p>
                        <p className="text-[11px] text-slate-500 mt-1">{item.createdAt ? new Date(item.createdAt).toLocaleString() : ''}</p>
                      </div>

                      {!item.readAt && (
                        <button
                          type="button"
                          onClick={() => markAlertRead(item._id).catch(() => {})}
                          disabled={markingReadId === item._id}
                          className={`text-xs font-semibold text-indigo-600 hover:text-indigo-700 ${markingReadId === item._id ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                          {markingReadId === item._id ? 'Saving…' : 'Mark read'}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {loadIssues.length > 0 && (
            <section className="rounded-xl border border-amber-300/70 dark:border-amber-700/70 bg-amber-50/70 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p>
                  Partial refresh: {loadIssues.join(', ')} {loadIssues.length > 1 ? 'were' : 'was'} unavailable. Showing latest available data.
                </p>
                {loadIssues.some((issue) => issue.includes('session expired') || issue.includes('authentication required')) && (
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1 rounded-md border border-amber-500/60 bg-amber-100/80 dark:bg-amber-900/40 px-2.5 py-1 text-xs font-semibold text-amber-900 dark:text-amber-200 hover:bg-amber-200/70 dark:hover:bg-amber-900/60"
                  >
                    Sign in again
                  </Link>
                )}
              </div>
            </section>
          )}

          {configHealth && (
            <section className="card p-4 space-y-2 border border-indigo-400/25 bg-gradient-to-r from-indigo-500/10 via-transparent to-violet-500/10">
              <p className="text-xs uppercase tracking-wide text-slate-500">System Setup Health</p>
              <div className="flex flex-wrap gap-2">
                {healthChecks.map((item) => (
                  <span key={item.key} title={item.healthy ? `${item.label} is healthy` : `${item.label}: ${item.fix}`}>
                    <Badge status={item.healthy ? item.okStatus : item.badStatus} label={item.label} dot />
                  </span>
                ))}
              </div>

              {failingChecks.length > 0 && (
                <details className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-900/20 p-3">
                  <summary className="cursor-pointer text-sm font-semibold text-amber-800 dark:text-amber-300">
                    Fix tips for {failingChecks.length} failing check{failingChecks.length > 1 ? 's' : ''}
                  </summary>
                  <div className="mt-3 space-y-3">
                    {failingChecks.map((item) => (
                      <div key={`tip-${item.key}`} className="rounded-md border border-amber-200/70 dark:border-amber-800/70 bg-white/70 dark:bg-slate-900/40 p-3">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{item.label}</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{item.fix}</p>
                        <p className="text-xs text-slate-500 mt-1">File: <code>{item.envFile}</code></p>
                        <p className="text-xs text-slate-500">Keys: <code>{item.envKeys.join(', ')}</code></p>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </section>
          )}

          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <Link to="/admin/users" className="block">
              <StatsCard
                icon={Users}
                label="Users"
                value={stats?.totalUsers ?? 0}
                color="blue"
                trend={Math.round(Number(stats?.userTrend7d?.changePct || 0))}
                trendLabel={`${formatWeeklyTrend(stats?.userTrend7d?.changePct)} · 7d ${stats?.userTrend7d?.current ?? 0} vs ${stats?.userTrend7d?.previous ?? 0}`}
                trendLabelClassName={getWeeklyTrendClass(stats?.userTrend7d?.direction)}
              />
            </Link>
            <Link to="/admin/reports" className="block">
              <StatsCard
                icon={FileWarning}
                label="Reports"
                value={stats?.totalReports ?? 0}
                color="indigo"
                trend={Math.round(Number(stats?.reportTrend7d?.changePct || 0))}
                trendLabel={`${formatWeeklyTrend(stats?.reportTrend7d?.changePct)} · 7d ${stats?.reportTrend7d?.current ?? 0} vs ${stats?.reportTrend7d?.previous ?? 0}`}
                trendLabelClassName={getWeeklyTrendClass(stats?.reportTrend7d?.direction)}
              />
            </Link>
            <Link to="/admin/reports" className="block">
              <StatsCard icon={Clock} label="Pending" value={stats?.pendingReports ?? 0} color="amber" />
            </Link>
            <Link to="/admin/verification" className="block">
              <StatsCard icon={ShieldCheck} label="ID Pending" value={stats?.pendingVerifications ?? 0} color="emerald" />
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="card p-4 bg-gradient-to-br from-red-500/10 to-transparent border border-red-500/25">
              <p className="text-sm text-slate-500">High-risk incidents</p>
              <p className="text-2xl font-bold text-red-600">{stats?.highRiskReports ?? 0}</p>
            </div>
            <div className="card p-4 bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/25">
              <p className="text-sm text-slate-500">Escalated incidents</p>
              <p className="text-2xl font-bold text-amber-600">{stats?.escalatedReports ?? 0}</p>
            </div>
            <div className="card p-4 bg-gradient-to-br from-indigo-500/10 to-transparent border border-indigo-500/25">
              <p className="text-sm text-slate-500">Active live streams</p>
              <p className="text-2xl font-bold text-indigo-600">{stats?.activeStreams ?? 0}</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="card p-4 bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/25">
              <p className="text-sm text-slate-500">Verified accounts</p>
              <p className="text-2xl font-bold text-emerald-600">{stats?.verifiedUsers ?? 0}</p>
              <p className="text-xs text-slate-500 mt-1">Awaiting/Unverified: {stats?.pendingOrUnverifiedUsers ?? 0}</p>
            </div>
            <div className="card p-4 bg-gradient-to-br from-slate-500/10 to-transparent border border-slate-400/30">
              <p className="text-sm text-slate-500">Inactive accounts</p>
              <p className="text-2xl font-bold text-slate-700 dark:text-slate-200">{stats?.inactiveUsers ?? 0}</p>
              <p className="text-xs text-slate-500 mt-1">Rejected IDs: {stats?.rejectedVerifications ?? 0}</p>
            </div>
            <div className="card p-4 bg-gradient-to-br from-cyan-500/10 to-transparent border border-cyan-500/25">
              <p className="text-sm text-slate-500">Today activity</p>
              <p className="text-2xl font-bold text-cyan-600">{stats?.newReportsToday ?? 0} reports</p>
              <p className="text-xs text-slate-500 mt-1">New users today: {stats?.newUsersToday ?? 0}</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="card p-4 bg-gradient-to-br from-indigo-500/10 to-transparent border border-indigo-500/25">
              <p className="text-sm text-slate-500">Under-review reports</p>
              <p className="text-2xl font-bold text-indigo-600">{stats?.reportsUnderReview ?? 0}</p>
            </div>
            <div className="card p-4 bg-gradient-to-br from-fuchsia-500/10 to-transparent border border-fuchsia-500/25">
              <p className="text-sm text-slate-500">User roles</p>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mt-1">
                Users {stats?.usersByRole?.user ?? 0} · Authority {stats?.usersByRole?.authority ?? 0} · Admin {stats?.usersByRole?.admin ?? 0}
              </p>
            </div>
            <div className="card p-4 bg-gradient-to-br from-violet-500/10 to-transparent border border-violet-500/25">
              <p className="text-sm text-slate-500">Total streams</p>
              <p className="text-2xl font-bold text-violet-600">{stats?.totalStreams ?? 0}</p>
              <p className="text-xs text-slate-500 mt-1">Active now: {stats?.activeStreams ?? 0}</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="card p-4 bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/25">
              <p className="text-sm text-slate-500 flex items-center gap-2"><Star className="w-4 h-4 text-amber-500" /> Average journey rating</p>
              <p className="text-2xl font-bold text-amber-600">
                {Number(stats?.averageJourneyRating || 0).toFixed(1)} <span className="text-sm font-medium text-slate-500">/ 5</span>
              </p>
              <p className={`text-xs mt-1 ${trendColor}`}>
                {trendDirection === 'up' ? '↗' : trendDirection === 'down' ? '↘' : '→'}
                {' '}
                {Math.abs(trendValue).toFixed(2)} pts ({Math.abs(trendPct).toFixed(1)}%) vs previous 30 days
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Last 30d: {Number(stats?.journeyRatingTrend?.current30dAverage || 0).toFixed(1)} ({stats?.journeyRatingTrend?.current30dCount || 0} responses)
                {' · '}
                Previous 30d: {Number(stats?.journeyRatingTrend?.previous30dAverage || 0).toFixed(1)} ({stats?.journeyRatingTrend?.previous30dCount || 0} responses)
              </p>
            </div>
            <div className="card p-4 bg-gradient-to-br from-violet-500/10 to-transparent border border-violet-500/25">
              <p className="text-sm text-slate-500">Journey feedback responses</p>
              <p className="text-2xl font-bold text-violet-600">{stats?.totalJourneyFeedback ?? 0}</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <div className="card p-4">
              <h2 className="font-semibold mb-3">Top Hotspot States</h2>
              <div className="space-y-2 text-sm">
                {(mapSummary?.byState || []).slice(0, 5).map((row) => (
                  <div key={row._id || 'unknown'} className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2">
                    <span className="text-slate-700 dark:text-slate-200">{row._id || 'Unknown'}</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{row.count}</span>
                  </div>
                ))}
                {(!mapSummary?.byState || mapSummary.byState.length === 0) && (
                  <p className="text-xs text-slate-500">No geospatial data yet.</p>
                )}
              </div>
            </div>

            <div className="card p-4">
              <h2 className="font-semibold mb-3">Report Status Mix</h2>
              <div className="space-y-2 text-sm">
                {(stats?.reportsByStatus || []).map((row) => {
                  const pct = Math.round(((row.count || 0) / Math.max(stats?.totalReports || 1, 1)) * 100)
                  return (
                    <div key={row._id || 'unknown'}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="capitalize text-slate-700 dark:text-slate-200">{String(row._id || 'unknown').replaceAll('_', ' ')}</span>
                        <span className="text-xs text-slate-500">{row.count} ({pct}%)</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div className="h-full bg-indigo-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h2 className="font-semibold">Latest Reports</h2>
              <Link to="/admin/reports" className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">Open Review Queue</Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-th">Title</th>
                    <th className="table-th">Reporter</th>
                    <th className="table-th">Category</th>
                    <th className="table-th">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentReports.map((report) => (
                    <tr key={report._id}>
                      <td className="table-td">{report.title}</td>
                      <td className="table-td">{report.submittedBy?.name || 'Anonymous'}</td>
                      <td className="table-td capitalize">{report.category?.replaceAll('_', ' ')}</td>
                      <td className="table-td"><Badge status={report.status} dot /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h2 className="font-semibold">Recent Audit Trail</h2>
              <Link to="/admin/reports" className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">Open moderation queue</Link>
            </div>

            <div className="divide-y divide-slate-200 dark:divide-slate-700">
              {auditLogs.length === 0 ? (
                <p className="p-4 text-sm text-slate-500">
                  {auditUnavailableMessage
                    ? `Audit logs temporarily unavailable ${auditUnavailableMessage}.`
                    : 'No audit activity yet.'}
                </p>
              ) : (
                auditLogs.map((log) => (
                  <div key={log._id} className="p-4 text-sm flex items-start gap-3">
                    {log?.actor?.profilePhoto && !avatarErrors[log._id] ? (
                      <img
                        src={log.actor.profilePhoto}
                        alt={`${log?.actor?.name || 'Actor'} profile`}
                        className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                        onError={() => markAvatarError(log._id)}
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 text-xs font-semibold flex items-center justify-center">
                        {getInitials(log?.actor?.name || 'System')}
                      </div>
                    )}

                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{log.action}</p>
                      <p className="text-xs text-slate-500">
                        {log?.actor?.name || 'System'}{log?.actor?.role ? ` (${log.actor.role})` : ''} · {log.entityType} · {new Date(log.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
