import { useEffect, useState } from 'react'
import { streamService } from '../services/reportService'
import LiveStreamRoom from '../components/LiveStreamRoom'

export default function LiveStartPage() {
  const [roomId, setRoomId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    const createStreamRoom = async () => {
      try {
        setLoading(true)
        setError('')

        const { data } = await streamService.startStream({
          title: 'Live Incident Stream',
        })

        const nextRoomId = data?.stream?.streamId || data?.stream?.roomId || ''
        if (!nextRoomId) {
          throw new Error('Failed to create stream room.')
        }

        if (active) setRoomId(nextRoomId)
      } catch (err) {
        if (active) {
          setError(err?.response?.data?.message || err?.message || 'Unable to initialize live stream room.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    createStreamRoom()

    return () => {
      active = false
    }
  }, [])

  if (loading) {
    return (
      <main className="max-w-5xl mx-auto p-6">
        <section className="card p-6 text-sm text-slate-500">Preparing your live stream room…</section>
      </main>
    )
  }

  if (error) {
    return (
      <main className="max-w-5xl mx-auto p-6">
        <section className="card p-6 space-y-3">
          <h1 className="text-xl font-semibold">Unable to start stream</h1>
          <p className="text-sm text-red-600">{error}</p>
        </section>
      </main>
    )
  }

  return <LiveStreamRoom role="streamer" initialRoomId={roomId} />
}