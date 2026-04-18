const Notification = require('../models/Notification');
const { createAuditLog } = require('./auditService');
const admin = require('firebase-admin'); // FCM
const twilio = require('twilio'); // SMS
const nodemailer = require('nodemailer'); // Email

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

    const results = await Promise.allSettled(
      channels.map(channel => sendViaChannel(channel, notification, recipients))
    );

    // Update status
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const status = successCount === channels.length ? 'sent' : 'partial';

    await Notification.findByIdAndUpdate(notification._id, {
      status,
      sentAt: new Date(),
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
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(process.env.FCM_SERVICE_ACCOUNT || '{}')),
    });
  }

  const messages = recipients.map(userId => ({
    token: `USER_FCM_TOKEN_${userId}`, // From User.fcmToken
    notification: {
      title: notification.title,
      body: notification.message,
    },
    data: notification.payload,
  }));

  await admin.messaging().sendEach(messages);
};

// ─── SMS (Twilio) ─────────────────────────────────────────────────────────
const sendSMS = async (notification, recipients) => {
  const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
  await client.messages.create({
    body: `${notification.title}: ${notification.message}`,
    from: process.env.TWILIO_PHONE,
    to: recipients.map(r => `+${r.phone}`), // Batch if supported
  });
};

// ─── Email (Nodemailer) ───────────────────────────────────────────────────
const sendEmail = async (notification, recipients) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail', // or process.env.SMTP_*
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    to: recipients.map(r => r.email),
    subject: notification.title,
    html: `<p>${notification.message}</p><pre>${JSON.stringify(notification.payload, null, 2)}</pre>`,
  });
};

// ─── In-app (Socket.io) ───────────────────────────────────────────────────
const sendInApp = (notification) => {
  // Emit via global io instance (inject in server.js)
  const io = require('../../server').io;
  io.emit('global_notification', notification);
};

const sendHighPriorityIncidentAlerts = notifyHighPriorityIncident;

module.exports = {
  notifyHighPriorityIncident,
  sendHighPriorityIncidentAlerts,
  dispatchMultiChannel,
};

