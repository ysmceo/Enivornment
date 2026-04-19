import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Video, Radio, Clock, Shield } from 'lucide-react'
import { streamService } from '../services/reportService'
import { format } from 'date-fns'
import { useAuth } from '../context/AuthContext'

export default function LiveHomePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [streams, setStreams] = useState([])
  const [loading, setLoading] = useState(true)
  const [joiningLatest, setJoiningLatest] = useState(false)
  const [joiningPremium, setJoiningPremium] = useState(false)
  const [joinError, setJoinError] = useState('')

  const premiumCode = String(import.meta.env.VITE_PREMIUM_STREAM_CODE || '2026').trim()
  const canAccessPremiumLive = user?.role === 'admin' || user?.premiumPlanActive === true || user?.premiumPlanStatus === 'active'

  useEffect(() => {
    streamService.getActiveStreams()
      .then((res) => setStreams(res.data.streams || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleJoinLatest = () => {
    setJoinError('')
    if (!streams.length) {
      setJoinError('No active stream is available right now.')
      return
    }

    const latest = streams[0]
    const latestStreamId = latest?.streamId || latest?.roomId || ''
    if (!latestStreamId) {
      setJoinError('No active stream is available right now.')
      return
    }

    setJoiningLatest(true)
    navigate(`/live/${encodeURIComponent(latestStreamId)}`)
  }

  const handleJoinPremiumLatest = async () => {
    if (!canAccessPremiumLive) {
      setJoinError('Premium live streams are available to active premium-plan members only.')
      return
    }

    setJoiningPremium(true)
    setJoinError('')

    try {
      const { data } = await streamService.getActiveStreams({
        accessLevel: 'premium',
        accessCode: premiumCode,
      })

      const latest = Array.isArray(data?.streams) && data.streams.length > 0 ? data.streams[0] : null
      const latestStreamId = latest?.streamId || latest?.roomId || ''

      if (!latestStreamId) {
        setJoinError('No premium private stream is active right now.')
        return
      }

      navigate(`/live/${encodeURIComponent(latestStreamId)}?code=${encodeURIComponent(premiumCode)}`)
    } catch (err) {
      setJoinError(err?.response?.data?.message || 'Unable to load premium live stream right now.')
    } finally {
      setJoiningPremium(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans">
      <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-extrabold text-slate-900 dark:text-white">
            TRUE <span className="text-indigo-600">CRIME HOOD</span>
            <span className="text-red-500 ml-1 text-xs font-semibold">LIVE</span>
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleJoinLatest}
            disabled={loading || joiningLatest}
            className={`flex items-center gap-2 px-4 py-2 border border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 text-sm font-semibold rounded-xl transition-colors ${loading || joiningLatest ? 'opacity-60 cursor-not-allowed' : 'hover:bg-indigo-50 dark:hover:bg-indigo-900/20'}`}
          >
            <Video className="w-4 h-4" />
            {joiningLatest ? 'Joining…' : 'Join Live Now'}
          </button>
          <Link to="/live/start" className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-colors">
            <Radio className="w-4 h-4" />
            Start Streaming
          </Link>
          <button
            type="button"
            onClick={() => handleJoinPremiumLatest().catch(() => {})}
            disabled={loading || joiningPremium || !canAccessPremiumLive}
            className={`flex items-center gap-2 px-4 py-2 border text-sm font-semibold rounded-xl transition-colors ${loading || joiningPremium || !canAccessPremiumLive
              ? 'opacity-60 cursor-not-allowed border-amber-200 text-amber-700 dark:border-amber-700 dark:text-amber-300'
              : 'border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20'}`}
            title={canAccessPremiumLive ? 'Join premium private stream (code 2026)' : 'Upgrade to premium plan to access private streams'}
          >
            <Video className="w-4 h-4" />
            {joiningPremium ? 'Joining Premium…' : 'Join Premium Live'}
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {joinError && (
          <section className="rounded-xl border border-amber-300/70 dark:border-amber-700/70 bg-amber-50/70 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-300 mb-5">
            {joinError}
          </section>
        )}

        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Active Streams</h2>

        {loading ? (
          <div className="card p-12 text-center">
            <div className="inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="mt-3 text-sm text-slate-500">Loading live streams...</p>
          </div>
        ) : streams.length === 0 ? (
          <div className="card p-12 text-center">
            <Video className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-500">No active streams currently</p>
            <p className="text-xs text-slate-400 mt-1">Verified users and admins can start a live stream.</p>
            <Link to="/live/start" className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-colors">
              <Radio className="w-4 h-4" />
              Start Streaming
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {streams.map((s) => (
              <Link
                key={s._id}
                to={`/live/${s.streamId}${s.accessLevel === 'premium' ? `?code=${encodeURIComponent(premiumCode)}` : ''}`}
                className="card p-4 hover:shadow-md transition-shadow group"
              >
                <div className="aspect-video bg-slate-800 dark:bg-slate-900 rounded-xl mb-3 flex items-center justify-center">
                  <Video className="w-8 h-8 text-slate-600 group-hover:text-indigo-400 transition-colors" />
                </div>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">{s.title || 'Untitled Stream'}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{s.streamer?.name || 'Anonymous'}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Tap to join instantly</p>
                  </div>
                  <span className="flex items-center gap-1 text-xs text-red-500 shrink-0">
                    {s.accessLevel === 'premium' && (
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 mr-1">
                        PREMIUM
                      </span>
                    )}
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    LIVE
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-400 mt-2">
                  <Clock className="w-3 h-3" />
                  {format(new Date(s.startedAt || s.createdAt), 'h:mm a')}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
