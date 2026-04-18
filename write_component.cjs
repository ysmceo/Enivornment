const fs = require('fs');
const dest = 'C:/Users/Dell/Desktop/eniveroment/frontend/src/components/LiveStreamRoom.jsx';
const code = import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Shield, Video, VideoOff, Mic, MicOff, PhoneOff, Users, ArrowLeft } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useWebRTC } from '../hooks/useWebRTC'
import { streamService } from '../services/reportService'
import toast from 'react-hot-toast'

export default function LiveStreamRoom({ role, initialRoomId }) {
  const isStreamer = role === 'streamer'
  const { user } = useAuth()
  const navigate = useNavigate()
  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const [streamId, setStreamId] = useState(initialRoomId || null)
  const [started, setStarted] = useState(false)
  const [connected, setConnected] = useState(false)
  const [muted, setMuted] = useState(false)
  const [videoOff, setVideoOff] = useState(false)
  const [viewerCount] = useState(0)
  const [starting, setStarting] = useState(false)

  const onRemoteStream = useCallback((stream) => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = stream
      setConnected(true)
    }
  }, [])

  const { startStream, joinAsViewer, stopStream, localStream } = useWebRTC({
    roomId: streamId,
    isInitiator: isStreamer,
    onStream: onRemoteStream,
  })

  async function handleStart() {
    try {
      setStarting(true)
      const res = await streamService.startStream({ title: (user ? user.name : 'User') + ' - Live' })
      const id = res.data && res.data.stream ? res.data.stream.streamId : res.data.streamId
      setStreamId(id)
      const ms = await startStream()
      if (localVideoRef.current) localVideoRef.current.srcObject = ms
      setStarted(true)
      toast.success('Stream started!')
    } catch (err) {
      toast.error(err && err.message === 'Permission denied' ? 'Camera/mic denied' : 'Failed to start')
    } finally {
      setStarting(false)
    }
  }

  const handleStop = useCallback(async () => {
    stopStream()
    if (streamId) { try { await streamService.endStream(streamId) } catch (_) {} }
    toast.success('Stream ended')
    navigate('/live')
  }, [stopStream, streamId, navigate])

  function toggleMute() {
    const s = localStream.current
    if (!s) return
    s.getAudioTracks().forEach(function(t) { t.enabled = muted })
    setMuted(function(m) { return !m })
  }

  function toggleVideo() {
    const s = localStream.current
    if (!s) return
    s.getVideoTracks().forEach(function(t) { t.enabled = videoOff })
    setVideoOff(function(v) { return !v })
  }

  useEffect(function() {
    if (!isStreamer && streamId) joinAsViewer()
  }, [isStreamer, streamId, joinAsViewer])

  useEffect(function() {
    return function() { if (isStreamer && started) stopStream() }
  }, [isStreamer, started, stopStream])

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <header className="h-16 flex items-center justify-between px-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          {!isStreamer && (
            <Link to="/live" className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          )}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Shield className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-bold text-white">
              CrimeReport{' '}
              <span className={isStreamer ? 'text-red-500' : 'text-indigo-400'}>
                {isStreamer ? 'LIVE' : 'Viewer'}
              </span>
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {(started || connected) && (
            <span className={\lex items-center gap-1.5 text-xs font-semibold \\}>
              <span className={\w-2 h-2 rounded-full \\} />
              {isStreamer ? 'LIVE' : 'CONNECTED'}
            </span>
          )}
          {isStreamer && started && (
            <span className="flex items-center gap-1.5 text-xs text-slate-400">
              <Users className="w-3.5 h-3.5" />
              {viewerCount} viewers
            </span>
          )}
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-3xl space-y-4">
          <div className="aspect-video bg-black rounded-2xl overflow-hidden border border-slate-700 relative">
            {isStreamer ? (
              <>
                <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                {!started && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                    <Video className="w-12 h-12 text-slate-600" />
                    <p className="text-slate-400 text-sm">Camera preview will appear here</p>
                  </div>
                )}
              </>
            ) : (
              <>
                <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                {!connected && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                    <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-slate-400 text-sm">Connecting to stream...</p>
                    <p className="text-slate-600 text-xs">Room: {streamId}</p>
                  </div>
                )}
              </>
            )}
          </div>
          <div className="flex items-center justify-center gap-3">
            {isStreamer && !started && (
              <button onClick={handleStart} disabled={starting}
                className="flex items-center gap-2 px-8 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors">
                {starting
                  ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Starting...</>
                  : <><Video className="w-4 h-4" />Go Live</>}
              </button>
            )}
            {isStreamer && started && (
              <>
                <button onClick={toggleMute}
                  className={\p-3 rounded-xl transition-colors \\}>
                  {muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
                <button onClick={toggleVideo}
                  className={\p-3 rounded-xl transition-colors \\}>
                  {videoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                </button>
                <button onClick={handleStop}
                  className="flex items-center gap-2 px-6 py-3 bg-red-700 hover:bg-red-800 text-white font-semibold rounded-xl transition-colors">
                  <PhoneOff className="w-4 h-4" />End Stream
                </button>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
;
fs.writeFileSync(dest, code, 'utf8');
console.log('OK bytes=' + fs.statSync(dest).size);
