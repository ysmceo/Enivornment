const jwt    = require('jsonwebtoken');
const Stream = require('../models/Stream');

/**
 * Socket.io handler — manages:
 *  1. JWT authentication for socket connections
 *  2. WebRTC signalling (offer / answer / ICE candidate exchange)
 *  3. Streaming rooms (join / leave / viewer counts)
 *  4. Real-time report notifications (admin ↔ user)
 */
const initSocketHandler = (io) => {

  // ─── Per-namespace authentication middleware ─────────────────────────────
  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        // Allow unauthenticated connections for public stream viewing
        socket.user = null;
        return next();
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded; // { id, role ... }
      next();
    } catch {
      // Invalid token — allow as guest viewer
      socket.user = null;
      next();
    }
  });

  // ─── Track active rooms and viewer counts ───────────────────────────────
  const rooms = new Map(); // roomId → Set<socketId>

  io.on('connection', (socket) => {
    console.log(`[Socket] Connected: ${socket.id} (user: ${socket.user?.id || 'guest'})`);

    // ── JOIN STREAM ROOM ──────────────────────────────────────────────────
    socket.on('join-room', async ({ roomId }) => {
      if (!roomId) return;

      socket.join(roomId);

      if (!rooms.has(roomId)) rooms.set(roomId, new Set());
      rooms.get(roomId).add(socket.id);

      const viewerCount = rooms.get(roomId).size;

      // Notify streamer of new viewer
      socket.to(roomId).emit('viewer-joined', {
        socketId: socket.id,
        viewerCount,
      });

      // Confirm to viewer
      socket.emit('room-joined', { roomId, viewerCount });

      // Update viewer count in DB (fire-and-forget)
      Stream.findOneAndUpdate(
        { roomId, status: 'active' },
        { viewerCount, $max: { peakViewerCount: viewerCount } }
      ).catch(() => {});
    });

    // ── LEAVE STREAM ROOM ─────────────────────────────────────────────────
    socket.on('leave-room', ({ roomId }) => {
      handleLeave(socket, roomId);
    });

    // ── WebRTC legacy relay (opt-in only) ─────────────────────────────────
    // NOTE:
    // Dedicated live-stream signaling is handled in `socket/signaling.js`.
    // These handlers are kept only for legacy clients that explicitly send
    // `{ legacy: true }` to avoid cross-handler event interference.
    socket.on('offer', ({ roomId, offer, sdp, targetSocketId, legacy }) => {
      if (!legacy) return;
      const payload = offer || sdp;
      if (!payload) return;

      if (targetSocketId) {
        io.to(targetSocketId).emit('offer', { offer: payload, fromSocketId: socket.id });
      } else if (roomId) {
        socket.to(roomId).emit('offer', { offer: payload, fromSocketId: socket.id });
      }
    });

    socket.on('answer', ({ answer, sdp, targetSocketId, legacy }) => {
      if (!legacy || !targetSocketId) return;
      const payload = answer || sdp;
      if (!payload) return;
      io.to(targetSocketId).emit('answer', { answer: payload, fromSocketId: socket.id });
    });

    socket.on('ice-candidate', ({ candidate, targetSocketId, roomId, legacy }) => {
      if (!legacy || !candidate) return;

      if (targetSocketId) {
        io.to(targetSocketId).emit('ice-candidate', { candidate, fromSocketId: socket.id });
      } else if (roomId) {
        socket.to(roomId).emit('ice-candidate', { candidate, fromSocketId: socket.id });
      }
    });

    // ── STREAM ENDED ──────────────────────────────────────────────────────
    socket.on('stream-ended', ({ roomId }) => {
      io.to(roomId).emit('stream-ended');
      rooms.delete(roomId);
    });

    // ── CHAT MESSAGE per-REPORT (reportId room) ───────────────────────────
    socket.on('chat-message', ({ reportId, message }) => {
      if (!reportId || !message?.trim()) return;
      const safeMsg = String(message).slice(0, 1000);
      const msgData = {
        _id: Date.now().toString(), // Temp
        reportId,
        message: safeMsg,
        senderId: socket.user?.id,
        senderName: socket.user?.name || 'Anonymous',
        senderRole: socket.user?.role || 'anonymous',
        isAnonymous: !socket.user,
        createdAt: new Date(),
      };
      socket.to(`chat_${reportId}`).emit('chat-message', msgData);
      socket.emit('chat-message', msgData); // Echo to sender
    });

    // ── REPORT STATUS NOTIFICATION (admin → user) ─────────────────────────
    // Admin emits to a user-specific room (room = `user_${userId}`)
    socket.on('join-user-room', () => {
      if (socket.user?.id) {
        socket.join(`user_${socket.user.id}`);
      }
    });

    socket.on('notify-user', ({ userId, message, reportId, status }) => {
      if (socket.user?.role !== 'admin') return; // Only admins can push notifications
      io.to(`user_${userId}`).emit('report-status-update', { message, reportId, status });
    });

    // ── DISCONNECT ────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      console.log(`[Socket] Disconnected: ${socket.id}`);
      // Remove from all tracked rooms
      for (const [roomId] of rooms) {
        handleLeave(socket, roomId);
      }
    });

    // ── Helper ────────────────────────────────────────────────────────────
    function handleLeave(sock, roomId) {
      sock.leave(roomId);
      if (rooms.has(roomId)) {
        rooms.get(roomId).delete(sock.id);
        const viewerCount = rooms.get(roomId).size;
        sock.to(roomId).emit('viewer-left', { socketId: sock.id, viewerCount });
        if (viewerCount === 0) rooms.delete(roomId);
        Stream.findOneAndUpdate(
          { roomId, status: 'active' },
          { viewerCount }
        ).catch(() => {});
      }
    }
  });
};

module.exports = initSocketHandler;
