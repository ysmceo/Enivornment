const jwt = require('jsonwebtoken');
const Stream = require('../models/Stream');
const StreamComment = require('../models/StreamComment');
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

const ALLOWED_REACTIONS = ['❤️', '🔥', '👏', '👍', '😂', '😮'];

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
  const commentRateMap = new Map();
  const likeByRoom = new Map();

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
      const user = await User.findById(decoded.id).select('name role isActive idVerificationStatus');

      if (!user || !user.isActive) {
        socket.data.user = null;
        return next();
      }

      socket.data.user = {
        id: String(user._id),
        name: user.name || 'User',
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
        reactionCounts: {},
      });
    }
    return rooms.get(roomId);
  };

  const getLikeSet = (roomId) => {
    if (!likeByRoom.has(roomId)) likeByRoom.set(roomId, new Set());
    return likeByRoom.get(roomId);
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

      io.emit('stream:ended', {
        roomId,
        streamId: roomId,
        endedAt: new Date().toISOString(),
      });

      await endStreamRecord(roomId);

      rooms.delete(roomId);
      likeByRoom.delete(roomId);
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
      likeByRoom.delete(roomId);
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

      if (!socket.data.user?.id) {
        ack({ ok: false, error: 'Authentication required before joining stream.' });
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

        if (user.role !== 'user' && user.role !== 'admin') {
          ack({ ok: false, error: 'Only verified users or admins can start a stream.' });
          return;
        }

        if (user.role === 'user' && user.idVerificationStatus !== 'verified') {
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
        likesCount: getLikeSet(roomId).size,
        reactionCounts: room.reactionCounts || {},
      };

      ack(response);

      if (role !== 'streamer' && room.streamerSocketId) {
        socket.emit('streamer-ready', {
          roomId,
          streamerSocketId: room.streamerSocketId,
        });
      }
    });

    socket.on('stream:comments:load', async ({ roomId, limit = 40 } = {}, ack = () => {}) => {
      try {
        if (!roomId) {
          ack({ ok: false, error: 'roomId is required.' });
          return;
        }

        const safeLimit = Math.max(1, Math.min(100, Number(limit) || 40));
        const comments = await StreamComment.find({ roomId, deleted: { $ne: true } })
          .sort({ createdAt: -1 })
          .limit(safeLimit)
          .lean();

        ack({ ok: true, comments: comments.reverse() });
      } catch {
        ack({ ok: false, error: 'Failed to load stream comments.' });
      }
    });

    socket.on('stream:comment:send', async ({ roomId, message } = {}, ack = () => {}) => {
      try {
        const user = socket.data.user;
        if (!user?.id) {
          ack({ ok: false, error: 'Authentication required to comment.' });
          return;
        }

        const normalizedMessage = String(message || '').trim();
        if (!roomId || !normalizedMessage) {
          ack({ ok: false, error: 'roomId and message are required.' });
          return;
        }

        if (normalizedMessage.length > 800) {
          ack({ ok: false, error: 'Comment is too long.' });
          return;
        }

        const now = Date.now();
        const recent = (commentRateMap.get(socket.id) || []).filter((ts) => now - ts < 5000);
        if (recent.length >= 5) {
          ack({ ok: false, error: 'You are commenting too fast. Please slow down.' });
          return;
        }
        recent.push(now);
        commentRateMap.set(socket.id, recent);

        const stream = await Stream.findOne({ roomId, status: 'active' }).select('_id roomId');
        if (!stream) {
          ack({ ok: false, error: 'This stream is no longer active.' });
          return;
        }

        const created = await StreamComment.create({
          streamId: stream._id,
          roomId: stream.roomId,
          senderId: user.id,
          senderName: user.name || 'User',
          senderRole: user.role,
          message: normalizedMessage,
        });

        const payload = {
          _id: created._id,
          roomId: created.roomId,
          senderId: created.senderId,
          senderName: created.senderName,
          senderRole: created.senderRole,
          message: created.message,
          createdAt: created.createdAt,
        };

        io.to(roomId).emit('stream:comment:new', payload);
        ack({ ok: true, comment: payload });
      } catch {
        ack({ ok: false, error: 'Failed to send comment.' });
      }
    });

    socket.on('stream:comment:delete', async ({ roomId, commentId } = {}, ack = () => {}) => {
      try {
        const user = socket.data.user;
        if (!user?.id) {
          ack({ ok: false, error: 'Authentication required.' });
          return;
        }

        if (!roomId || !commentId) {
          ack({ ok: false, error: 'roomId and commentId are required.' });
          return;
        }

        const comment = await StreamComment.findOne({ _id: commentId, roomId });
        if (!comment || comment.deleted) {
          ack({ ok: false, error: 'Comment not found.' });
          return;
        }

        const canModerate = user.role === 'admin';
        const isOwnComment = String(comment.senderId) === String(user.id);
        if (!canModerate && !isOwnComment) {
          ack({ ok: false, error: 'Not authorized to remove this comment.' });
          return;
        }

        comment.deleted = true;
        comment.deletedBy = user.id;
        await comment.save();

        io.to(roomId).emit('stream:comment:removed', {
          roomId,
          commentId,
          removedByRole: user.role,
        });

        ack({ ok: true, commentId });
      } catch {
        ack({ ok: false, error: 'Failed to remove comment.' });
      }
    });

    socket.on('stream:like:toggle', async ({ roomId } = {}, ack = () => {}) => {
      try {
        const user = socket.data.user;
        if (!user?.id || !roomId) {
          ack({ ok: false, error: 'Authentication and roomId are required.' });
          return;
        }

        const stream = await Stream.findOne({ roomId, status: 'active' }).select('_id roomId likesCount');
        if (!stream) {
          ack({ ok: false, error: 'Stream is not active.' });
          return;
        }

        const likeSet = getLikeSet(roomId);
        const key = String(user.id);
        let liked;
        if (likeSet.has(key)) {
          likeSet.delete(key);
          liked = false;
        } else {
          likeSet.add(key);
          liked = true;
        }

        const likesCount = likeSet.size;
        await Stream.findOneAndUpdate({ roomId, status: 'active' }, { likesCount }).catch(() => {});

        io.to(roomId).emit('stream:likes:update', { roomId, likesCount });
        ack({ ok: true, liked, likesCount });
      } catch {
        ack({ ok: false, error: 'Failed to update like.' });
      }
    });

    socket.on('stream:reaction:send', async ({ roomId, emoji } = {}, ack = () => {}) => {
      try {
        const user = socket.data.user;
        if (!user?.id || !roomId || !emoji) {
          ack({ ok: false, error: 'Authentication, roomId and emoji are required.' });
          return;
        }

        if (!ALLOWED_REACTIONS.includes(emoji)) {
          ack({ ok: false, error: 'Unsupported reaction.' });
          return;
        }

        const stream = await Stream.findOne({ roomId, status: 'active' }).select('_id roomId reactionCounts');
        if (!stream) {
          ack({ ok: false, error: 'Stream is not active.' });
          return;
        }

        const room = ensureRoom(roomId);
        const currentCounts = room.reactionCounts || {};
        const next = Number(currentCounts[emoji] || 0) + 1;
        currentCounts[emoji] = next;
        room.reactionCounts = currentCounts;

        await Stream.findOneAndUpdate(
          { roomId, status: 'active' },
          { $inc: { [`reactionCounts.${emoji}`]: 1 } }
        ).catch(() => {});

        io.to(roomId).emit('stream:reaction:new', {
          roomId,
          emoji,
          senderName: user.name || 'User',
          senderRole: user.role,
          createdAt: new Date().toISOString(),
        });

        io.to(roomId).emit('stream:reactions:update', {
          roomId,
          reactionCounts: currentCounts,
        });

        ack({ ok: true, reactionCounts: currentCounts });
      } catch {
        ack({ ok: false, error: 'Failed to send reaction.' });
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
      commentRateMap.delete(socket.id);
      await cleanupSocket(socket);
    });
  });
};

module.exports = { registerSignalingHandlers };
