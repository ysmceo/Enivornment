const Stream = require('../models/Stream');
const { buildNewStreamPayload } = require('../services/streamService');

// ─── START STREAM ─────────────────────────────────────────────────────────
/**
 * POST /api/streams
 * Creates a stream record and returns a unique room ID for WebRTC signalling.
 */
const startStream = async (req, res) => {
  try {
    const isUser = req.user?.role === 'user';
    const isAdmin = req.user?.role === 'admin';

    if (!isUser && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Only verified users or admins can start a stream.' });
    }

    if (isUser && req.user?.idVerificationStatus !== 'verified') {
      return res.status(403).json({ success: false, message: 'Identity verification is required before streaming.' });
    }

    const { payload } = buildNewStreamPayload({ body: req.body, userId: req.user._id });

    const stream = await Stream.create(payload);

    const io = req.app.get('io');
    if (io) {
      io.emit('stream:started', {
        streamId: stream.streamId,
        roomId: stream.roomId,
        title: stream.title,
        startedAt: stream.startedAt,
        startedBy: {
          id: req.user._id,
          name: req.user.name || 'A user',
          role: req.user.role,
        },
        joinPath: `/live/${stream.streamId}`,
      });
    }

    res.status(201).json({ success: true, stream });
  } catch (err) {
    console.error('[Streams] startStream error:', err.message);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── END STREAM ───────────────────────────────────────────────────────────
/**
 * PATCH /api/streams/:id/end
 */
const endStream = async (req, res) => {
  try {
    const stream = await Stream.findOne({ _id: req.params.id, streamer: req.user._id });
    if (!stream) return res.status(404).json({ success: false, message: 'Stream not found.' });

    const endedAt  = new Date();
    const duration = Math.floor((endedAt - stream.startedAt) / 1000);

    stream.status   = 'ended';
    stream.active   = false;
    stream.endedAt  = endedAt;
    stream.duration = duration;
    await stream.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('stream:ended', {
        streamId: stream.streamId,
        roomId: stream.roomId,
        title: stream.title,
        endedAt: stream.endedAt,
      });
    }

    res.status(200).json({ success: true, message: 'Stream ended.', stream });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── GET ACTIVE STREAMS ───────────────────────────────────────────────────
/**
 * GET /api/streams
 */
const getActiveStreams = async (req, res) => {
  try {
    const streams = await Stream.find({ status: 'active' })
      .sort({ startedAt: -1 })
      .populate('streamer', 'name');
    res.status(200).json({ success: true, streams });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── GET STREAM BY ID ─────────────────────────────────────────────────────
/**
 * GET /api/streams/:id
 */
const getStreamById = async (req, res) => {
  try {
    const stream = await Stream.findById(req.params.id).populate('streamer', 'name');
    if (!stream) return res.status(404).json({ success: false, message: 'Stream not found.' });
    res.status(200).json({ success: true, stream });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── GET MY STREAMS ───────────────────────────────────────────────────────
/**
 * GET /api/streams/my
 */
const getMyStreams = async (req, res) => {
  try {
    const streams = await Stream.find({ streamer: req.user._id }).sort({ startedAt: -1 });
    res.status(200).json({ success: true, streams });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = { startStream, endStream, getActiveStreams, getStreamById, getMyStreams };
