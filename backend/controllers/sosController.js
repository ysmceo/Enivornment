const SOSAlert = require('../models/SOSAlert');
const { createSOS, updateSOSLocation, getActiveSOS, acknowledgeSOS, resolveSOS } = require('../services/sosService');

/**
 * POST /api/sos
 * Create one-tap SOS alert (requires verified user).
 */
const createSOSAlert = async (req, res) => {
  try {
    // Require ID verification
    if (req.user.idVerificationStatus !== 'verified') {
      return res.status(403).json({
        success: false,
        message: 'Government ID verification required for SOS.',
      });
    }

    const { title, description, latitude, longitude } = req.body;

    const coordinates = {
      type: 'Point',
      coordinates: [parseFloat(longitude), parseFloat(latitude)], // [lng, lat]
    };

    const alert = await createSOS(
      {
        userId: req.user._id,
        title: title || 'Emergency SOS',
        description: description || '',
        initialLocation: { coordinates },
      },
      req,
      true // auto-stream
    );

    res.status(201).json({
      success: true,
      message: 'SOS alert activated. Help is on the way!',
      alert,
      instructions: 'Share your location link with trusted contacts.',
    });
  } catch (err) {
    console.error('[SOS] create error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to activate SOS.' });
  }
};

/**
 * PUT /api/sos/:alertId/location
 * Update live location tracking.
 */
const updateSOSLocation = async (req, res) => {
  try {
    const { alertId } = req.params;
    const { latitude, longitude, speed, accuracy } = req.body;

    const alert = await updateSOSLocation(alertId, {
      coordinates: {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
      },
      speed: parseFloat(speed),
      accuracy: parseFloat(accuracy),
    }, req);

    if (!alert) {
      return res.status(404).json({ success: false, message: 'SOS not found.' });
    }

    res.status(200).json({
      success: true,
      message: 'Location updated.',
      alert: {
        _id: alert._id,
        status: alert.status,
        currentLocation: alert.currentLocation,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update location.' });
  }
};

/**
 * GET /api/sos/active
 * Admin: List active SOS alerts.
 */
const getActiveSOSAlerts = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin only.' });
    }

    const page = Math.max(1, parseInt(req.query.page || 1));
    const limit = Math.min(50, parseInt(req.query.limit || 10));
    const state = req.query.state;

    const { alerts, pagination } = await getActiveSOS({ page, limit, state });

    res.status(200).json({
      success: true,
      alerts,
      pagination,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch active SOS.' });
  }
};

/**
 * POST /api/sos/:alertId/acknowledge
 * Admin acknowledges SOS.
 */
const acknowledgeSOSAlert = async (req, res) => {
  try {
    const { alertId } = req.params;

    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin only.' });
    }

    const alert = await acknowledgeSOS(alertId, req.user._id, req);

    res.status(200).json({
      success: true,
      message: 'SOS acknowledged.',
      alert,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to acknowledge.' });
  }
};

/**
 * POST /api/sos/:alertId/resolve
 * Resolve/complete SOS.
 */
const resolveSOSAlert = async (req, res) => {
  try {
    const { alertId } = req.params;
    const { cancelled } = req.body;

    const alert = await resolveSOS(alertId, req.user._id, cancelled, req);

    res.status(200).json({
      success: true,
      message: cancelled ? 'SOS cancelled.' : 'SOS resolved.',
      alert,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to resolve SOS.' });
  }
};

/**
 * POST /api/sos/:alertId/cancel
 * User cancels own SOS.
 */
const cancelSOSAlert = async (req, res) => {
  try {
    const { alertId } = req.params;

    const alert = await SOSAlert.findOne({ _id: alertId, userId: req.user._id });
    if (!alert) {
      return res.status(404).json({ success: false, message: 'SOS not found.' });
    }

    await resolveSOS(alertId, req.user._id, true, req); // Cancelled=true

    res.status(200).json({ success: true, message: 'SOS cancelled.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to cancel SOS.' });
  }
};

module.exports = {
  createSOSAlert,
  updateSOSLocation,
  getActiveSOSAlerts,
  acknowledgeSOSAlert,
  resolveSOSAlert,
  cancelSOSAlert,
};

