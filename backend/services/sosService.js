const SOSAlert = require('../models/SOSAlert');
const Stream = require('../models/Stream');
const { sendHighPriorityIncidentAlerts } = require('./notificationService');
const { recordAuditLog } = require('./auditService');
const User = require('../models/User');

/**
 * SOS Service — emergency one-tap alerts with live tracking.
 */

/**
 * Create new SOS alert, auto-notify admins, optional auto-stream.
 */
const createSOS = async (payload, req, autoStream = false) => {
  const { userId, title, description, initialLocation } = payload;

  const alert = new SOSAlert({
    userId,
    title,
    description,
    currentLocation: initialLocation,
    locationHistory: initialLocation ? [{ ...initialLocation }] : [],
  });

  await alert.save();

  // Optional: auto-start stream
  let streamId = null;
  if (autoStream) {
    const streamPayload = {
      streamer: userId,
      title: `SOS Live Stream - ${title}`,
      roomId: `sos_${alert._id}`,
    };
    // Simplified - full stream logic in controller
    streamId = await Stream.create(streamPayload)._id;
    alert.streamId = streamId;
    await alert.save();
  }

  // Notify all active admins
  const adminUsers = await User.find({ role: 'admin', isActive: true }).select('_id');
  await sendHighPriorityIncidentAlerts({
    req,
    report: alert, // Reuse for SOS
    adminUsers,
  });

  await recordAuditLog({
    req,
    actor: userId,
    actorRole: 'user',
    action: 'sos_alert_created',
    entityType: 'sos',
    entityId: alert._id,
    metadata: {
      autoStream,
      streamId: streamId?.toString(),
      initialLocation,
    },
  });

  return alert;
};

/**
 * Update live location (push to history, update current).
 */
const updateSOSLocation = async (alertId, locationData, req) => {
  const { coordinates, speed, accuracy } = locationData;

  const update = {
    'currentLocation.coordinates': coordinates,
    'currentLocation.updatedAt': new Date(),
    '$push': {
      locationHistory: {
        coordinates,
        speed,
        accuracy,
        timestamp: new Date(),
      },
    },
  };

  const alert = await SOSAlert.findByIdAndUpdate(alertId, update, { new: true });

  await recordAuditLog({
    req,
    actor: req.user._id,
    action: 'sos_location_updated',
    entityType: 'sos',
    entityId: alertId,
    metadata: { speed, accuracy },
  });

  return alert;
};

/**
 * Get active SOS alerts for admin dashboard (latest locations).
 */
const getActiveSOS = async (options = {}) => {
  const { page = 1, limit = 20, state } = options;
  const skip = (page - 1) * limit;

  const filter = { status: 'active' };
  if (state) filter['locationHistory.state'] = state; // If extended

  const alerts = await SOSAlert.find(filter)
    .populate('userId', 'name phone state idVerificationStatus')
    .populate('acknowledgedBy', 'name')
    .sort({ 'currentLocation.updatedAt': -1 })
    .skip(skip)
    .limit(limit);

  const total = await SOSAlert.countDocuments(filter);

  return {
    alerts,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
};

/**
 * Acknowledge SOS (admin claims).
 */
const acknowledgeSOS = async (alertId, adminId, req) => {
  const update = {
    status: 'acknowledged',
    acknowledgedBy: adminId,
    acknowledgedAt: new Date(),
  };

  const alert = await SOSAlert.findByIdAndUpdate(alertId, update, { new: true })
    .populate('userId', 'name');

  await recordAuditLog({
    req,
    actor: adminId,
    action: 'sos_acknowledged',
    entityType: 'sos',
    entityId: alertId,
  });

  // Notify user
  // sendNotification(alert.userId, { type: 'sos_acknowledged', alert });

  return alert;
};

/**
 * Resolve/cancel SOS.
 */
const resolveSOS = async (alertId, resolverId, cancelled = false, req) => {
  const status = cancelled ? 'cancelled' : 'resolved';
  const field = cancelled ? 'cancelledBy' : 'acknowledgedBy';
  const timeField = cancelled ? 'cancelledAt' : 'acknowledgedAt'; // Reuse for resolve

  const update = {
    status,
    [field]: resolverId,
    [timeField]: new Date(),
  };

  await SOSAlert.findByIdAndUpdate(alertId, update);

  await recordAuditLog({
    req,
    actor: resolverId,
    action: cancelled ? 'sos_cancelled' : 'sos_resolved',
    entityType: 'sos',
    entityId: alertId,
  });
};

module.exports = {
  createSOS,
  updateSOSLocation,
  getActiveSOS,
  acknowledgeSOS,
  resolveSOS,
};

