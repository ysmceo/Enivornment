const Notification = require('../models/Notification');
const { createAuditLog } = require('./auditService');

const resolveUserIds = (recipients = []) =>
  recipients
    .map((r) => (typeof r === 'string' ? r : r?._id || r?.id || null))
    .filter(Boolean);

const loadOptionalModule = (moduleName) => {
  try {
    // eslint-disable-next-line global-require, import/no-dynamic-require
    return require(moduleName);
  } catch {
    return null;
  }
};

const queueNotification = async ({
  userId = null,
  reportId = null,
  channel = 'in_app',
  type = 'system',
  title,
  message,
  payload = {},
}) => {
  const notification = await Notification.create({
    userId,
    reportId,
    type,
    title,
    message,
    payload,
    channel,
    status: 'queued',
  });

  dispatchMultiChannel(notification).catch(console.error);
  return notification;
};

const notifyHighPriorityIncident = async ({ req, report, recipients = [] }) => {
  const payload = {
    reportId: report?._id,
    title: report?.title || 'High Priority Alert',
    severity: report?.severity || 'critical',
    state: report?.state,
    category: report?.category || 'emergency',
    recipients,
    channels: ['sms', 'email', 'push', 'in_app'],
  };

  // Queue in DB
  const notification = await Notification.create({
    userId: null, // Multi-recipient
    reportId: payload.reportId,
    type: 'high_priority_incident',
    title: payload.title,
    message: `Critical ${payload.severity} incident in ${payload.state || 'Nigeria'}: ${payload.title}`,
    payload,
    channel: 'queued',
  });

  console.info('[Notifications] Queued:', notification._id);

  await createAuditLog({
    req,
    actor: req?.user?._id,
    action: 'notification.queued',
    entityType: 'notification',
    entityId: notification._id,
    metadata: payload,
  });

  // Dispatch async
  dispatchMultiChannel(notification).catch(console.error);

  return { queued: true, notificationId: notification._id, payload };
};

const sendHighPriorityIncidentAlerts = notifyHighPriorityIncident;

// ─── Multi-channel dispatch ───────────────────────────────────────────────
const dispatchMultiChannel = async (notification) => {
  try {
    const { channels, payload, recipients = [] } = notification.payload || {};
    const normalizedChannels = Array.isArray(channels) && channels.length ? channels : ['in_app'];

    const results = await Promise.allSettled(
      normalizedChannels.map(channel => sendViaChannel(channel, notification, recipients))
    );

    // Update status
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const status = successCount > 0 ? 'sent' : 'failed';

    await Notification.findByIdAndUpdate(notification._id, {
      status,
      sentAt: new Date(),
      error:
        successCount === normalizedChannels.length
          ? null
          : `Delivered ${successCount}/${normalizedChannels.length} channels`,
    });
  } catch (err) {
    await Notification.findByIdAndUpdate(notification._id, {
      status: 'failed',
      error: err.message,
    });
  }
};

const sendViaChannel = async (channel, notification, recipients) => {
  switch (channel) {
    case 'push':
      return sendFCM(notification, recipients);
    case 'sms':
      return sendSMS(notification, recipients);
    case 'email':
      return sendEmail(notification, recipients);
    case 'in_app':
      return sendInApp(notification); // Socket.io
    default:
      throw new Error(`Unknown channel: ${channel}`);
  }
};

// ─── FCM Push (Firebase) ──────────────────────────────────────────────────
const sendFCM = async (notification, recipients) => {
  const admin = loadOptionalModule('firebase-admin');
  if (!admin) {
    console.warn('[Notifications] firebase-admin not installed; skipping push notifications.');
    return;
  }

  const serviceAccountRaw = process.env.FCM_SERVICE_ACCOUNT;
  if (!serviceAccountRaw) {
    console.warn('[Notifications] FCM_SERVICE_ACCOUNT not set; skipping push notifications.');
    return;
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(serviceAccountRaw)),
    });
  }

  const targetUserIds = resolveUserIds(recipients);
  const messages = targetUserIds.map((userId) => ({
    token: `USER_FCM_TOKEN_${userId}`,
    notification: {
      title: notification.title,
      body: notification.message,
    },
    data: {
      reportId: String(notification.payload?.reportId || ''),
      severity: String(notification.payload?.severity || ''),
      category: String(notification.payload?.category || ''),
    },
  }));

  if (!messages.length) return;

  await admin.messaging().sendEach(messages);
};

// ─── SMS (Twilio) ─────────────────────────────────────────────────────────
const sendSMS = async (notification, recipients) => {
  const twilio = loadOptionalModule('twilio');
  if (!twilio) {
    console.warn('[Notifications] twilio not installed; skipping SMS notifications.');
    return;
  }

  if (!process.env.TWILIO_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE) {
    console.warn('[Notifications] Twilio env vars missing; skipping SMS notifications.');
    return;
  }

  const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

  const phoneTargets = recipients
    .map((r) => (typeof r === 'object' ? r.phone : null))
    .filter(Boolean)
    .map((phone) => (String(phone).startsWith('+') ? phone : `+${phone}`));

  await Promise.all(
    phoneTargets.map((phone) =>
      client.messages.create({
        body: `${notification.title}: ${notification.message}`,
        from: process.env.TWILIO_PHONE,
        to: phone,
      })
    )
  );
};

// ─── Email (Nodemailer) ───────────────────────────────────────────────────
const sendEmail = async (notification, recipients) => {
  const nodemailer = loadOptionalModule('nodemailer');
  if (!nodemailer) {
    console.warn('[Notifications] nodemailer not installed; skipping email notifications.');
    return;
  }

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('[Notifications] Email env vars missing; skipping email notifications.');
    return;
  }

  const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const emailTargets = recipients
    .map((r) => (typeof r === 'object' ? r.email : null))
    .filter(Boolean);

  if (!emailTargets.length) return;

  await transporter.sendMail({
    to: emailTargets,
    subject: notification.title,
    html: `<p>${notification.message}</p><pre>${JSON.stringify(notification.payload, null, 2)}</pre>`,
  });
};

// ─── In-app (Socket.io) ───────────────────────────────────────────────────
const sendInApp = (notification) => {
  const io = global.__io;
  if (!io) return;

  if (notification.userId) {
    io.to(`user_${String(notification.userId)}`).emit('notification', {
      _id: notification._id,
      title: notification.title,
      message: notification.message,
      payload: notification.payload,
      createdAt: notification.createdAt,
    });
    return;
  }

  io.emit('global_notification', {
    _id: notification._id,
    title: notification.title,
    message: notification.message,
    payload: notification.payload,
    createdAt: notification.createdAt,
  });
};

module.exports = {
  notifyHighPriorityIncident,
  sendHighPriorityIncidentAlerts,
  queueNotification,
  dispatchMultiChannel,
};

