import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Video, Radio, Clock, Shield } from 'lucide-react'
import { streamService } from '../services/reportService'
import { format } from 'date-fns'

export default function LiveHomePage() {
  const [streams, setStreams] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    streamService.getActiveStreams()
      .then((res) => setStreams(res.data.streams || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans">
      <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-extrabold text-slate-900 dark:text-white">
            Crime<span className="text-indigo-600">Report</span>
            <span className="text-red-500 ml-1 text-xs font-semibold">LIVE</span>
          </span>
        </div>
        <Link to="/live/start" className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-colors">
          <Radio className="w-4 h-4" />
          Start Streaming
        </Link>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Active Streams</h2>

        {loading ? (
          <div className="card p-12 text-center">
            <div className="inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="mt-3 text-sm text-slate-500">Loading streams...</p>
          </div>
        ) : streams.length === 0 ? (
          <div className="card p-12 text-center">
            <Video className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-500">No active streams</p>
            <p className="text-xs text-slate-400 mt-1">Be the first to go live!</p>
            <Link to="/live/start" className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-colors">
              <Radio className="w-4 h-4" />
              Start Stream
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {streams.map((s) => (
              <Link
                key={s._id}
                to={`/live/${s.streamId}`}
                className="card p-4 hover:shadow-md transition-shadow group"
              >
                <div className="aspect-video bg-slate-800 dark:bg-slate-900 rounded-xl mb-3 flex items-center justify-center">
                  <Video className="w-8 h-8 text-slate-600 group-hover:text-indigo-400 transition-colors" />
                </div>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">{s.title || 'Untitled Stream'}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{s.streamer?.name || 'Anonymous'}</p>
                  </div>
                  <span className="flex items-center gap-1 text-xs text-red-500 shrink-0">
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
