import { useCallback, useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from '../context/AuthContext'

const RTC_CONFIG = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
}

const SIGNALING_URL =
  import.meta.env.VITE_SOCKET_URL ||
  `${window.location.protocol}//${window.location.hostname}:${import.meta.env.VITE_API_PORT || '5001'}`

export default function LiveStreamRoom({ role = 'viewer', initialRoomId = '', autoStart = false }) {
  const { token } = useAuth()
  const [roomId, setRoomId] = useState(initialRoomId)
  const [inSession, setInSession] = useState(false)
  const [status, setStatus] = useState('Idle')
  const [connectionState, setConnectionState] = useState('new')
  const [viewerCount, setViewerCount] = useState(0)
  const [error, setError] = useState('')

  const socketRef = useRef(null)
  const localStreamRef = useRef(null)
  const peersRef = useRef(new Map())
  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const autoStartTriggeredRef = useRef(false)

  useEffect(() => {
    if (!inSession && initialRoomId) {
      setRoomId(initialRoomId)
    }
  }, [inSession, initialRoomId])

  const closePeers = useCallback(() => {
    peersRef.current.forEach((pc) => pc.close())
    peersRef.current.clear()
  }, [])

  const stopLocalMedia = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
      localStreamRef.current = null
    }

    if (localVideoRef.current) localVideoRef.current.srcObject = null
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null
  }, [])

  const cleanupSession = useCallback(() => {
    closePeers()

    if (socketRef.current) {
      socketRef.current.emit('leave-stream')
      socketRef.current.disconnect()
      socketRef.current = null
    }

    stopLocalMedia()
    setInSession(false)
    setViewerCount(0)
    setConnectionState('closed')
    setStatus('Session ended')
  }, [closePeers, stopLocalMedia])

  const ensureLocalMedia = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current

    if (role !== 'streamer') return null

    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    })

    localStreamRef.current = stream
    if (localVideoRef.current) localVideoRef.current.srcObject = stream

    return stream
  }, [role])

  const createPeerConnection = useCallback((peerSocketId) => {
    const existing = peersRef.current.get(peerSocketId)
    if (existing) return existing

    const pc = new RTCPeerConnection(RTC_CONFIG)

    if (localStreamRef.current && role === 'streamer') {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current)
      })
    } else if (role !== 'streamer') {
      pc.addTransceiver('video', { direction: 'recvonly' })
      pc.addTransceiver('audio', { direction: 'recvonly' })
    }

    pc.onicecandidate = (event) => {
      if (!event.candidate || !socketRef.current) return

      socketRef.current.emit('ice-candidate', {
        roomId,
        targetSocketId: peerSocketId,
        candidate: event.candidate,
      })
    }

    pc.ontrack = (event) => {
      const [stream] = event.streams
      if (stream && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream
      }
    }

    pc.onconnectionstatechange = () => {
      setConnectionState(pc.connectionState)
      if (pc.connectionState === 'connected') setStatus('Peer connection established')
      if (pc.connectionState === 'failed') setError('WebRTC connection failed. Try reconnecting.')
    }

    peersRef.current.set(peerSocketId, pc)
    return pc
  }, [role, roomId])

  const sendOffer = useCallback(async (targetSocketId) => {
    const pc = createPeerConnection(targetSocketId)
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)

    socketRef.current?.emit('offer', {
      roomId,
      targetSocketId,
      sdp: offer,
    })
  }, [createPeerConnection, roomId])

  const connectSocket = useCallback(() => {
    const socket = io(SIGNALING_URL, {
      transports: ['websocket'],
      auth: token ? { token } : undefined,
    })

    socket.on('connect', () => {
      setStatus('Connected to signaling server')
      setError('')
    })

    socket.on('disconnect', () => setStatus('Disconnected from signaling server'))
    socket.on('connect_error', (err) => setError(`Socket error: ${err.message}`))

    socket.on('viewer-count', ({ count }) => {
      setViewerCount(count || 0)
    })

    socket.on('stream-ended', () => {
      setError('Stream ended by streamer.')
      cleanupSession()
    })

    socket.on('offer', async ({ fromSocketId, sdp }) => {
      try {
        const pc = createPeerConnection(fromSocketId)
        await pc.setRemoteDescription(new RTCSessionDescription(sdp))

        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)

        socket.emit('answer', {
          roomId,
          targetSocketId: fromSocketId,
          sdp: answer,
        })
      } catch (err) {
        setError(`Offer handling failed: ${err.message}`)
      }
    })

    socket.on('answer', async ({ fromSocketId, sdp }) => {
      try {
        const pc = peersRef.current.get(fromSocketId)
        if (!pc) return
        await pc.setRemoteDescription(new RTCSessionDescription(sdp))
      } catch (err) {
        setError(`Answer handling failed: ${err.message}`)
      }
    })

    socket.on('ice-candidate', async ({ fromSocketId, candidate }) => {
      try {
        const pc = peersRef.current.get(fromSocketId)
        if (!pc) return
        await pc.addIceCandidate(new RTCIceCandidate(candidate))
      } catch (err) {
        setError(`ICE candidate failed: ${err.message}`)
      }
    })

    socket.on('streamer-ready', async ({ streamerSocketId }) => {
      if (role === 'streamer') return
      await sendOffer(streamerSocketId)
    })

    socket.on('peer-left', ({ socketId }) => {
      const pc = peersRef.current.get(socketId)
      if (pc) {
        pc.close()
        peersRef.current.delete(socketId)
      }
    })

    socketRef.current = socket
    return socket
  }, [cleanupSession, createPeerConnection, role, roomId, sendOffer, token])

  const startSession = useCallback(async () => {
    setError('')

    if (!roomId.trim()) {
      setError('Room ID is required')
      return
    }

    try {
      await ensureLocalMedia()
      const socket = connectSocket()

      socket.emit('join-stream', { roomId, role }, async (ack) => {
        if (!ack?.ok) {
          setError(ack?.error || 'Failed to join stream room')
          return
        }

        setInSession(true)
        setViewerCount(ack.viewerCount || 0)
        setStatus(role === 'streamer' ? 'Streaming live' : 'Watching live stream')

        if (role !== 'streamer' && ack.streamerSocketId) {
          await sendOffer(ack.streamerSocketId)
        }
      })
    } catch (err) {
      setError(`Unable to start session: ${err.message}`)
    }
  }, [connectSocket, ensureLocalMedia, role, roomId, sendOffer])

  useEffect(() => {
    if (!autoStart || inSession || autoStartTriggeredRef.current) return
    if (!roomId?.trim()) return

    autoStartTriggeredRef.current = true
    startSession().catch(() => {
      // allow manual retry from the button
      autoStartTriggeredRef.current = false
    })
  }, [autoStart, inSession, roomId, startSession])

  useEffect(() => {
    return () => cleanupSession()
  }, [cleanupSession])

  return (
    <section className="max-w-6xl mx-auto p-6">
      <div className="card p-6 space-y-5">
        <div>
          <h1 className="text-2xl font-bold">{role === 'streamer' ? 'Start Live Incident Stream' : 'Join Live Incident Stream'}</h1>
          <p className="text-sm text-slate-500 mt-1">Role: <span className="font-semibold">{role}</span></p>
        </div>

        <div className="grid md:grid-cols-3 gap-3">
          <input
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            placeholder="Room ID"
            className="input md:col-span-2"
            disabled={inSession}
          />

          {!inSession ? (
            <button className="btn-primary" onClick={startSession}>
              {role === 'streamer' ? 'Start Stream' : 'Join Stream'}
            </button>
          ) : (
            <button className="btn-danger" onClick={cleanupSession}>End Session</button>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div className="card p-3"><p className="text-slate-500">Status</p><p className="font-semibold mt-1">{status}</p></div>
          <div className="card p-3"><p className="text-slate-500">Connection</p><p className="font-semibold mt-1">{connectionState}</p></div>
          <div className="card p-3"><p className="text-slate-500">Viewers</p><p className="font-semibold mt-1">{viewerCount}</p></div>
        </div>

        {error && <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>}

        <div className="grid lg:grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-semibold mb-2">Local Stream</p>
            <video ref={localVideoRef} autoPlay playsInline muted className="w-full aspect-video bg-black rounded-xl border border-slate-200 dark:border-slate-700" />
          </div>
          <div>
            <p className="text-sm font-semibold mb-2">Remote Stream</p>
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full aspect-video bg-black rounded-xl border border-slate-200 dark:border-slate-700" />
          </div>
        </div>
      </div>
    </section>
  )
}
