import { useCallback, useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from '../context/AuthContext'
import { useParams } from 'react-router-dom'

const SIGNALING_URL = import.meta.env.VITE_SOCKET_URL || `${window.location.protocol}//${window.location.hostname}:${import.meta.env.VITE_API_PORT || '5001'}`

export default function AdminLiveViewerPage() {
  const { token } = useAuth()
  const { streamId } = useParams()

  const [roomId, setRoomId] = useState(streamId || '')
  const [inSession, setInSession] = useState(false)
  const [status, setStatus] = useState('Idle')
  const [error, setError] = useState('')

  const socketRef = useRef(null)
  const videoRef = useRef(null)

  const stopSession = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('leave-stream')
      socketRef.current.disconnect()
      socketRef.current = null
    }
    if (videoRef.current) videoRef.current.srcObject = null
    setInSession(false)
    setStatus('Session ended')
  }, [])

  const joinSession = useCallback(() => {
    if (!roomId.trim()) {
      setError('Room ID is required')
      return
    }

    setError('')
    const socket = io(SIGNALING_URL, {
      transports: ['websocket'],
      auth: token ? { token } : undefined,
    })

    socket.on('connect', () => setStatus('Connected to signaling server'))
    socket.on('connect_error', (err) => setError(err.message || 'Socket connection failed'))
    socket.on('viewer-count', ({ count }) => setStatus(`Watching · ${count || 0} viewer(s)`))
    socket.on('stream-ended', () => setStatus('Streamer ended the stream'))

    socket.emit('join-stream', { roomId, role: 'admin' }, (ack) => {
      if (!ack?.ok) {
        setError(ack?.error || 'Unable to join stream')
        return
      }
      setInSession(true)
    })

    socketRef.current = socket
  }, [roomId, token])

  useEffect(() => () => stopSession(), [stopSession])

  return (
    <main className="max-w-5xl mx-auto p-6">
      <section className="card p-6 space-y-4">
        <h1 className="text-2xl font-bold">Admin Live Viewer</h1>
        <input className="input" value={roomId} onChange={(e) => setRoomId(e.target.value)} placeholder="Enter room ID" disabled={inSession} />
        {!inSession ? (
          <button className="btn-primary" onClick={joinSession}>Join Stream</button>
        ) : (
          <button className="btn-danger" onClick={stopSession}>Leave Stream</button>
        )}
        <p className="text-sm text-slate-500">{status}</p>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <video ref={videoRef} autoPlay playsInline controls className="w-full aspect-video bg-black rounded-xl border border-slate-700" />
      </section>
    </main>
  )
}
