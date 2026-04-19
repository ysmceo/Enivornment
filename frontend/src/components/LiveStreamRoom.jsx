import { useCallback, useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from '../context/AuthContext'

const RTC_CONFIG = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
}

const REACTION_OPTIONS = ['❤️', '🔥', '👏', '👍', '😂', '😮']

const QUALITY_PRESETS = {
  auto: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 24, max: 30 } },
  low: { width: { ideal: 640 }, height: { ideal: 360 }, frameRate: { ideal: 15, max: 20 } },
  medium: { width: { ideal: 854 }, height: { ideal: 480 }, frameRate: { ideal: 20, max: 24 } },
  high: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 24, max: 30 } },
}

const SIGNALING_URL =
  import.meta.env.VITE_SOCKET_URL ||
  `${window.location.protocol}//${window.location.hostname}:${import.meta.env.VITE_API_PORT || '5001'}`

export default function LiveStreamRoom({ role = 'viewer', initialRoomId = '', autoStart = false }) {
  const { token, user } = useAuth()
  const [roomId, setRoomId] = useState(initialRoomId)
  const [inSession, setInSession] = useState(false)
  const [status, setStatus] = useState('Idle')
  const [connectionState, setConnectionState] = useState('new')
  const [viewerCount, setViewerCount] = useState(0)
  const [error, setError] = useState('')
  const [comments, setComments] = useState([])
  const [commentInput, setCommentInput] = useState('')
  const [sendingComment, setSendingComment] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)
  const [likesCount, setLikesCount] = useState(0)
  const [liked, setLiked] = useState(false)
  const [reactionCounts, setReactionCounts] = useState({})
  const [quality, setQuality] = useState('auto')

  const socketRef = useRef(null)
  const localStreamRef = useRef(null)
  const peersRef = useRef(new Map())
  const pendingCandidatesRef = useRef(new Map())
  const offerTargetsRef = useRef(new Set())
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
    pendingCandidatesRef.current.clear()
    offerTargetsRef.current.clear()
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
    setLikesCount(0)
    setLiked(false)
    setReactionCounts({})
    setComments([])
    setCommentInput('')
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

  const applyQualityPreset = useCallback(async (nextQuality) => {
    if (role !== 'streamer') return
    const stream = localStreamRef.current
    if (!stream) return

    const videoTrack = stream.getVideoTracks?.()[0]
    if (!videoTrack) return

    const constraints = QUALITY_PRESETS[nextQuality] || QUALITY_PRESETS.auto
    try {
      await videoTrack.applyConstraints(constraints)
      setQuality(nextQuality)
    } catch {
      setError('Unable to apply selected quality profile on this device.')
    }
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

  const normalizeSdp = useCallback((value, expectedType) => {
    if (!value || typeof value !== 'object') return null

    const type = typeof value.type === 'string' ? value.type : null
    const sdp = typeof value.sdp === 'string' ? value.sdp : null
    if (!type || !sdp) return null
    if (!['offer', 'answer'].includes(type)) return null
    if (expectedType && type !== expectedType) return null

    return { type, sdp }
  }, [])

  const queueCandidate = useCallback((peerSocketId, candidate) => {
    if (!peerSocketId || !candidate) return
    const existing = pendingCandidatesRef.current.get(peerSocketId) || []
    existing.push(candidate)
    pendingCandidatesRef.current.set(peerSocketId, existing)
  }, [])

  const flushCandidateQueue = useCallback(async (peerSocketId) => {
    const pc = peersRef.current.get(peerSocketId)
    const queued = pendingCandidatesRef.current.get(peerSocketId) || []
    if (!pc || !pc.remoteDescription || queued.length === 0) return

    for (const candidate of queued) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate))
      } catch {
        // ignore invalid stale candidates
      }
    }

    pendingCandidatesRef.current.delete(peerSocketId)
  }, [])

  const sendOffer = useCallback(async (targetSocketId) => {
    if (!targetSocketId || offerTargetsRef.current.has(targetSocketId)) return

    const pc = createPeerConnection(targetSocketId)

    if (pc.signalingState !== 'stable') {
      return
    }

    const offer = await pc.createOffer()
    const normalizedOffer = normalizeSdp(offer, 'offer')
    if (!normalizedOffer) return

    await pc.setLocalDescription(offer)

    const localDescription = normalizeSdp(pc.localDescription, 'offer')
    if (!localDescription) return

    offerTargetsRef.current.add(targetSocketId)

    socketRef.current?.emit('offer', {
      roomId,
      targetSocketId,
      sdp: localDescription,
    })
  }, [createPeerConnection, normalizeSdp, roomId])

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

    socket.on('stream:likes:update', ({ roomId: eventRoomId, likesCount: nextLikes }) => {
      if (eventRoomId !== roomId) return
      setLikesCount(Number(nextLikes || 0))
    })

    socket.on('stream:reactions:update', ({ roomId: eventRoomId, reactionCounts: nextCounts }) => {
      if (eventRoomId !== roomId) return
      setReactionCounts(nextCounts || {})
    })

    socket.on('stream-ended', () => {
      setError('Stream ended by streamer.')
      cleanupSession()
    })

    socket.on('offer', async ({ fromSocketId, sdp, offer }) => {
      try {
        const incomingOffer = normalizeSdp(sdp || offer, 'offer')
        if (!incomingOffer || !fromSocketId) return

        const pc = createPeerConnection(fromSocketId)

        if (pc.signalingState === 'have-local-offer') {
          await pc.setLocalDescription({ type: 'rollback' })
        }

        if (pc.signalingState !== 'stable') return

        await pc.setRemoteDescription(new RTCSessionDescription(incomingOffer))

        if (pc.signalingState !== 'have-remote-offer') return

        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)

        const localAnswer = normalizeSdp(pc.localDescription, 'answer')
        if (!localAnswer) return

        socket.emit('answer', {
          roomId,
          targetSocketId: fromSocketId,
          sdp: localAnswer,
        })

        await flushCandidateQueue(fromSocketId)
      } catch (err) {
        setError(`Offer handling failed: ${err.message}`)
      }
    })

    socket.on('answer', async ({ fromSocketId, sdp, answer }) => {
      try {
        const incomingAnswer = normalizeSdp(sdp || answer, 'answer')
        if (!incomingAnswer || !fromSocketId) return

        const pc = peersRef.current.get(fromSocketId)
        if (!pc) return

        if (pc.signalingState !== 'have-local-offer') return

        await pc.setRemoteDescription(new RTCSessionDescription(incomingAnswer))
        await flushCandidateQueue(fromSocketId)
      } catch (err) {
        setError(`Answer handling failed: ${err.message}`)
      }
    })

    socket.on('ice-candidate', async ({ fromSocketId, candidate }) => {
      try {
        if (!fromSocketId || !candidate) return

        const pc = peersRef.current.get(fromSocketId)
        if (!pc || !pc.remoteDescription) {
          queueCandidate(fromSocketId, candidate)
          return
        }

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
      offerTargetsRef.current.delete(socketId)
      pendingCandidatesRef.current.delete(socketId)
    })

    socket.on('stream:comment:new', (comment) => {
      if (!comment?.roomId || comment.roomId !== roomId) return
      setComments((prev) => [...prev, comment])
    })

    socket.on('stream:comment:removed', ({ roomId: eventRoomId, commentId }) => {
      if (eventRoomId !== roomId || !commentId) return
      setComments((prev) => prev.filter((item) => String(item._id) !== String(commentId)))
    })

    socketRef.current = socket
    return socket
  }, [cleanupSession, createPeerConnection, flushCandidateQueue, normalizeSdp, queueCandidate, role, roomId, sendOffer, token])

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
        setLikesCount(ack.likesCount || 0)
        setReactionCounts(ack.reactionCounts || {})
        setLiked(false)
        setStatus(role === 'streamer' ? 'Streaming live' : 'Watching live stream')

        socket.emit('stream:comments:load', { roomId, limit: 50 }, (commentAck) => {
          if (commentAck?.ok) {
            setComments(commentAck.comments || [])
          }
        })

        // Offer is initiated on `streamer-ready` event to avoid duplicate negotiations.
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

  const sendComment = useCallback(() => {
    const message = String(commentInput || '').trim()
    if (!inSession || !message) return
    if (!socketRef.current) return

    setSendingComment(true)
    socketRef.current.emit('stream:comment:send', { roomId, message }, (ack) => {
      setSendingComment(false)
      if (!ack?.ok) {
        setError(ack?.error || 'Failed to send comment.')
        return
      }
      setCommentInput('')
      setError('')
    })
  }, [commentInput, inSession, roomId])

  const toggleLike = useCallback(() => {
    if (!inSession || !socketRef.current) return

    socketRef.current.emit('stream:like:toggle', { roomId }, (ack) => {
      if (!ack?.ok) {
        setError(ack?.error || 'Unable to update like.')
        return
      }
      setLiked(Boolean(ack.liked))
      setLikesCount(Number(ack.likesCount || 0))
      setError('')
    })
  }, [inSession, roomId])

  const sendReaction = useCallback((emoji) => {
    if (!inSession || !socketRef.current) return

    socketRef.current.emit('stream:reaction:send', { roomId, emoji }, (ack) => {
      if (!ack?.ok) {
        setError(ack?.error || 'Unable to send reaction.')
        return
      }
      setReactionCounts(ack.reactionCounts || {})
      setError('')
    })
  }, [inSession, roomId])

  const removeComment = useCallback((commentId) => {
    if (!inSession || !socketRef.current || !commentId) return

    socketRef.current.emit('stream:comment:delete', { roomId, commentId }, (ack) => {
      if (!ack?.ok) {
        setError(ack?.error || 'Unable to remove comment.')
        return
      }
      setComments((prev) => prev.filter((item) => String(item._id) !== String(commentId)))
      setError('')
    })
  }, [inSession, roomId])

  const canModerateComments = user?.role === 'admin'

  const copyRoomCode = useCallback(async () => {
    if (!roomId?.trim()) return
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(roomId)
      }
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 1200)
    } catch {
      setError('Unable to copy stream code automatically.')
    }
  }, [roomId])

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

        <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3.5 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs text-slate-500">Live Code</p>
            <p className="text-sm font-semibold break-all">{roomId || 'Not set'}</p>
          </div>
          <button type="button" className="btn-secondary" onClick={copyRoomCode} disabled={!roomId?.trim()}>
            {copiedCode ? 'Copied!' : 'Copy Code'}
          </button>
        </div>

        {role === 'streamer' && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3.5 flex flex-wrap items-center gap-2">
            <p className="text-xs text-slate-500 mr-2">Video Quality</p>
            {Object.keys(QUALITY_PRESETS).map((q) => (
              <button
                key={q}
                type="button"
                className={`rounded-lg border px-2.5 py-1 text-xs ${quality === q ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}
                onClick={() => applyQualityPreset(q)}
                disabled={!inSession}
              >
                {q.toUpperCase()}
              </button>
            ))}
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div className="card p-3"><p className="text-slate-500">Status</p><p className="font-semibold mt-1">{status}</p></div>
          <div className="card p-3"><p className="text-slate-500">Connection</p><p className="font-semibold mt-1">{connectionState}</p></div>
          <div className="card p-3"><p className="text-slate-500">Viewers</p><p className="font-semibold mt-1">{viewerCount}</p></div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3.5 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={`btn-secondary ${liked ? '!bg-rose-100 !text-rose-700 !border-rose-300' : ''}`}
              onClick={toggleLike}
              disabled={!inSession}
            >
              {liked ? '♥ Liked' : '♡ Like'}
            </button>
            <p className="text-sm text-slate-600 dark:text-slate-300">{likesCount} like{likesCount === 1 ? '' : 's'}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {REACTION_OPTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="rounded-lg border border-slate-300 dark:border-slate-700 px-2.5 py-1 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                onClick={() => sendReaction(emoji)}
                disabled={!inSession}
              >
                {emoji} <span className="text-xs text-slate-500">{reactionCounts?.[emoji] || 0}</span>
              </button>
            ))}
          </div>
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

        <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">Live Comments</p>
            <p className="text-xs text-slate-500">Signed in as {user?.name || 'User'}</p>
          </div>

          <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-100 dark:border-slate-800 p-3 space-y-2 bg-slate-50/70 dark:bg-slate-900/40">
            {comments.length === 0 ? (
              <p className="text-xs text-slate-500">No comments yet. Be the first to comment.</p>
            ) : (
              comments.map((comment) => (
                <div key={comment._id || `${comment.senderId}-${comment.createdAt}`} className="text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-slate-700 dark:text-slate-200">
                      {comment.senderName}
                      <span className="ml-2 text-[11px] font-normal text-slate-400">
                        {comment.createdAt ? new Date(comment.createdAt).toLocaleTimeString() : ''}
                      </span>
                    </p>
                    {(canModerateComments || String(comment.senderId) === String(user?._id)) && (
                      <button
                        type="button"
                        className="text-[11px] text-rose-600 hover:text-rose-700"
                        onClick={() => removeComment(comment._id)}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 break-words">{comment.message}</p>
                </div>
              ))
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              className="input flex-1"
              maxLength={800}
              placeholder={inSession ? 'Write a comment…' : 'Join a stream to comment'}
              value={commentInput}
              disabled={!inSession || sendingComment}
              onChange={(e) => setCommentInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  sendComment()
                }
              }}
            />
            <button
              type="button"
              className="btn-primary"
              disabled={!inSession || !commentInput.trim() || sendingComment}
              onClick={sendComment}
            >
              {sendingComment ? 'Sending…' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
