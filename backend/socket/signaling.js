const jwt = require('jsonwebtoken');
const Stream = require('../models/Stream');
const User = require('../models/User');

const updateViewerStats = async (roomId, viewerCount) => {
  await Stream.findOneAndUpdate(
    { roomId, status: 'active' },
    {
      viewerCount,
      $max: { peakViewerCount: viewerCount },
    }
  ).catch(() => {});
};

const endStreamRecord = async (roomId) => {
  const stream = await Stream.findOne({ roomId, status: 'active' }).catch(() => null);
  if (!stream) return;

  const endedAt = new Date();
  const duration = Math.max(0, Math.floor((endedAt.getTime() - stream.startedAt.getTime()) / 1000));

  stream.status = 'ended';
  stream.active = false;
  stream.endedAt = endedAt;
  stream.duration = duration;
  stream.viewerCount = 0;

  await stream.save().catch(() => {});
};

const registerSignalingHandlers = (io) => {
  const rooms = new Map();

  io.use(async (socket, next) => {
    try {
      const authHeader = socket.handshake.headers?.authorization;
      const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
      const token = socket.handshake.auth?.token || bearerToken || null;

      if (!token) {
        socket.data.user = null;
        return next();
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('role isActive idVerificationStatus');

      if (!user || !user.isActive) {
        socket.data.user = null;
        return next();
      }

      socket.data.user = {
        id: String(user._id),
        role: user.role,
        idVerificationStatus: user.idVerificationStatus,
      };

      return next();
    } catch {
      socket.data.user = null;
      return next();
    }
  });

  const ensureRoom = (roomId) => {
    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        streamerSocketId: null,
        viewerSocketIds: new Set(),
      });
    }
    return rooms.get(roomId);
  };

  const emitViewerCount = (roomId) => {
    const room = rooms.get(roomId);
    if (!room) return;

    io.to(roomId).emit('viewer-count', {
      roomId,
      count: room.viewerSocketIds.size,
    });
  };

  const cleanupSocket = async (socket) => {
    const { roomId, role } = socket.data || {};
    if (!roomId || !rooms.has(roomId)) return;

    const room = rooms.get(roomId);

    if (role === 'streamer') {
      io.to(roomId).emit('stream-ended', {
        roomId,
        reason: 'Streamer disconnected',
      });

      await endStreamRecord(roomId);

      rooms.delete(roomId);
      return;
    }

    room.viewerSocketIds.delete(socket.id);

    io.to(roomId).emit('peer-left', {
      roomId,
      socketId: socket.id,
    });

    emitViewerCount(roomId);
    await updateViewerStats(roomId, room.viewerSocketIds.size);

    if (!room.streamerSocketId && room.viewerSocketIds.size === 0) {
      rooms.delete(roomId);
    }
  };

  io.on('connection', (socket) => {
    const token = socket.handshake.auth?.token;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.data.userId = decoded.id;
      } catch {
        socket.data.userId = null;
      }
    }

    socket.emit('signaling-ready', {
      socketId: socket.id,
      message: 'Connected to signaling server',
    });

    socket.on('join-user-room', () => {
      if (socket.data.userId) {
        socket.join(`user_${socket.data.userId}`);
      }
    });

    socket.on('join-stream', async ({ roomId, role }, ack = () => {}) => {
      if (!roomId || !role) {
        ack({ ok: false, error: 'roomId and role are required' });
        return;
      }

      if (!['streamer', 'viewer', 'admin'].includes(role)) {
        ack({ ok: false, error: 'Invalid role. Use streamer, viewer, or admin.' });
        return;
      }

      if (socket.data.roomId && socket.data.roomId !== roomId) {
        await cleanupSocket(socket);
      }

      const user = socket.data.user;

      if (role === 'streamer') {
        if (!user) {
          ack({ ok: false, error: 'Authentication required to stream.' });
          return;
        }

        if (user.role !== 'user') {
          ack({ ok: false, error: 'Only user accounts can start a stream.' });
          return;
        }

        if (user.idVerificationStatus !== 'verified') {
          ack({ ok: false, error: 'Identity verification is required before streaming.' });
          return;
        }
      }

      if (role === 'admin') {
        if (!user || user.role !== 'admin') {
          ack({ ok: false, error: 'Only admins can join as admin viewer.' });
          return;
        }
      }

      const room = ensureRoom(roomId);

      if (role === 'streamer') {
        if (room.streamerSocketId && room.streamerSocketId !== socket.id) {
          ack({ ok: false, error: 'This room already has an active streamer.' });
          return;
        }

        room.streamerSocketId = socket.id;
      } else {
        room.viewerSocketIds.add(socket.id);
      }

      socket.join(roomId);
      socket.data.roomId = roomId;
      socket.data.role = role;
      socket.data.joinedAt = Date.now();

      emitViewerCount(roomId);
      await updateViewerStats(roomId, room.viewerSocketIds.size);

      const response = {
        ok: true,
        roomId,
        role,
        streamerSocketId: room.streamerSocketId,
        viewerCount: room.viewerSocketIds.size,
      };

      ack(response);

      if (role !== 'streamer' && room.streamerSocketId) {
        socket.emit('streamer-ready', {
          roomId,
          streamerSocketId: room.streamerSocketId,
        });
      }
    });

    socket.on('offer', ({ roomId, targetSocketId, sdp } = {}) => {
      if (!roomId || !targetSocketId || !sdp) return;

      io.to(targetSocketId).emit('offer', {
        roomId,
        fromSocketId: socket.id,
        sdp,
      });
    });

    socket.on('answer', ({ roomId, targetSocketId, sdp } = {}) => {
      if (!roomId || !targetSocketId || !sdp) return;

      io.to(targetSocketId).emit('answer', {
        roomId,
        fromSocketId: socket.id,
        sdp,
      });
    });

    socket.on('ice-candidate', ({ roomId, targetSocketId, candidate } = {}) => {
      if (!roomId || !targetSocketId || !candidate) return;

      io.to(targetSocketId).emit('ice-candidate', {
        roomId,
        fromSocketId: socket.id,
        candidate,
      });
    });

    socket.on('leave-stream', async () => {
      await cleanupSocket(socket);
    });

    socket.on('disconnect', async () => {
      await cleanupSocket(socket);
    });
  });
};

module.exports = { registerSignalingHandlers };
