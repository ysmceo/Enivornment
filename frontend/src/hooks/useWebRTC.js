import { useRef, useCallback, useEffect } from 'react';
import Peer from 'simple-peer';
import { useSocket } from './useSocket';

/**
 * useWebRTC
 * Provides WebRTC peer-to-peer streaming over a Socket.io signalling channel.
 *
 * @param {string}   roomId       - The stream room/channel ID.
 * @param {boolean}  isInitiator  - True for the streamer; false for viewers.
 * @param {Function} onStream     - Called with the remote MediaStream once connected.
 */
export function useWebRTC({ roomId, isInitiator, onStream }) {
  const { socket, emit, on } = useSocket();
  const peersRef       = useRef({});   // socketId → Peer instance
  const localStreamRef = useRef(null);

  // ─── Cleanup helper ────────────────────────────────────────────────────
  const destroyPeer = useCallback((socketId) => {
    peersRef.current[socketId]?.destroy();
    delete peersRef.current[socketId];
  }, []);

  // ─── Create or get a peer for a given remote socket ────────────────────
  const createPeer = useCallback((targetSocketId, initiator, stream) => {
    if (peersRef.current[targetSocketId]) return peersRef.current[targetSocketId];

    const peer = new Peer({
      initiator,
      trickle: true,
      stream,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      },
    });

    peer.on('signal', (signalData) => {
      const event = signalData.type === 'offer' ? 'offer' : 'answer';
      emit(event === 'offer'
        ? 'offer'
        : 'answer',
        {
          roomId,
          [event]:      signalData,
          targetSocketId,
        });
    });

    peer.on('stream', (remoteStream) => {
      onStream?.(remoteStream, targetSocketId);
    });

    peer.on('error', (err) => {
      console.warn('[WebRTC] Peer error:', err.message);
      destroyPeer(targetSocketId);
    });

    peer.on('close', () => destroyPeer(targetSocketId));

    // ICE candidate trickle
    peer.on('signal', (data) => {
      if (data.candidate) {
        emit('ice-candidate', { candidate: data, targetSocketId, roomId });
      }
    });

    peersRef.current[targetSocketId] = peer;
    return peer;
  }, [roomId, emit, onStream, destroyPeer]);

  // ─── Start streaming (initiator = streamer) ───────────────────────────
  const startStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      emit('join-room', { roomId });
      return stream;
    } catch (err) {
      console.error('[WebRTC] getUserMedia error:', err.message);
      throw err;
    }
  }, [emit, roomId]);

  // ─── Join as viewer ───────────────────────────────────────────────────
  const joinAsViewer = useCallback(() => {
    emit('join-room', { roomId });
  }, [emit, roomId]);

  // ─── Stop streaming ───────────────────────────────────────────────────
  const stopStream = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    Object.keys(peersRef.current).forEach(destroyPeer);
    emit('stream-ended', { roomId });
  }, [emit, roomId, destroyPeer]);

  // ─── Socket event listeners ────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    // Someone joined the room → streamer creates an offer
    const offViewer = on('viewer-joined', ({ socketId }) => {
      if (isInitiator && localStreamRef.current) {
        createPeer(socketId, true, localStreamRef.current);
      }
    });

    // Streamer sent an offer → viewer answers
    const offOffer = on('offer', ({ offer, fromSocketId }) => {
      if (!isInitiator) {
        const peer = createPeer(fromSocketId, false, localStreamRef.current);
        peer.signal(offer);
      }
    });

    // Viewer sent an answer → streamer finalises
    const offAnswer = on('answer', ({ answer, fromSocketId }) => {
      peersRef.current[fromSocketId]?.signal(answer);
    });

    // ICE candidate
    const offIce = on('ice-candidate', ({ candidate, fromSocketId }) => {
      peersRef.current[fromSocketId]?.signal(candidate);
    });

    // Remote peer disconnected
    const offViewerLeft = on('viewer-left', ({ socketId }) => destroyPeer(socketId));

    // Stream ended (broadcast from streamer)
    const offEnded = on('stream-ended', () => {
      Object.keys(peersRef.current).forEach(destroyPeer);
    });

    return () => {
      offViewer();
      offOffer();
      offAnswer();
      offIce();
      offViewerLeft();
      offEnded();
    };
  }, [socket, isInitiator, on, createPeer, destroyPeer]);

  // ─── Cleanup on unmount ────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      Object.keys(peersRef.current).forEach(destroyPeer);
    };
  }, [destroyPeer]);

  return { startStream, joinAsViewer, stopStream, localStream: localStreamRef };
}
