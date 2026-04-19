import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Link } from 'react-router-dom'
import LiveStreamRoom from '../components/LiveStreamRoom'
import { streamService } from '../services/reportService'

export default function AdminLiveViewerPage() {
  const navigate = useNavigate()
  const { streamId } = useParams()
  const [searchParams] = useSearchParams()
  const [joiningLatest, setJoiningLatest] = useState(false)
  const [joiningPremium, setJoiningPremium] = useState(false)
  const [joinError, setJoinError] = useState('')

  const premiumCode = String(import.meta.env.VITE_PREMIUM_STREAM_CODE || '2026').trim()
  const accessCode = String(searchParams.get('code') || '').trim()

  const joinLatestStream = async () => {
    setJoiningLatest(true)
    setJoinError('')

    try {
      const { data } = await streamService.getActiveStreams()
      const latest = Array.isArray(data?.streams) && data.streams.length > 0 ? data.streams[0] : null
      const latestStreamId = latest?.streamId || latest?.roomId || ''

      if (!latestStreamId) {
        setJoinError('No active stream is available right now.')
        return
      }

      navigate(`/admin/live/${encodeURIComponent(latestStreamId)}`)
    } catch (err) {
      setJoinError(err?.response?.data?.message || 'Unable to load active streams right now.')
    } finally {
      setJoiningLatest(false)
    }
  }

  const joinLatestPremiumStream = async () => {
    setJoiningPremium(true)
    setJoinError('')

    try {
      const { data } = await streamService.getActiveStreams({ accessLevel: 'premium', accessCode: premiumCode })
      const latest = Array.isArray(data?.streams) && data.streams.length > 0 ? data.streams[0] : null
      const latestStreamId = latest?.streamId || latest?.roomId || ''

      if (!latestStreamId) {
        setJoinError('No premium private stream is active right now.')
        return
      }

      navigate(`/admin/live/${encodeURIComponent(latestStreamId)}?code=${encodeURIComponent(premiumCode)}`)
    } catch (err) {
      setJoinError(err?.response?.data?.message || 'Unable to load premium streams right now.')
    } finally {
      setJoiningPremium(false)
    }
  }

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-4">
      <section className="card p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-semibold">Admin Live Monitor</h1>
          <p className="text-xs text-slate-500 mt-1">
            Start your stream or join the latest active stream with one click.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/live/start" className="btn-primary text-sm">Start Live Stream</Link>
          <Link to="/live/start?premium=1" className="btn-secondary text-sm">Start Premium Live (Code 2026)</Link>
          <button
            type="button"
            className={`btn-secondary text-sm ${joiningLatest ? 'opacity-70 cursor-not-allowed' : ''}`}
            onClick={() => joinLatestStream().catch(() => {})}
            disabled={joiningLatest}
          >
            {joiningLatest ? 'Joining…' : 'Join Latest Live'}
          </button>
          <button
            type="button"
            className={`btn-secondary text-sm ${joiningPremium ? 'opacity-70 cursor-not-allowed' : ''}`}
            onClick={() => joinLatestPremiumStream().catch(() => {})}
            disabled={joiningPremium}
          >
            {joiningPremium ? 'Joining Premium…' : 'Join Premium Live'}
          </button>
        </div>
      </section>

      {joinError && (
        <section className="rounded-xl border border-amber-300/70 dark:border-amber-700/70 bg-amber-50/70 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          {joinError}
        </section>
      )}

      <LiveStreamRoom role="admin" initialRoomId={streamId || ''} autoStart={Boolean(streamId)} accessCode={accessCode} />
    </main>
  )
}
