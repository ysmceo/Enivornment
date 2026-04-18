const ChatMessage = require('../models/ChatMessage');
const { evaluateModeration } = require('./moderationService');
const { recordAuditLog } = require('./auditService');

/**
 * Chat Service — handles message CRUD with moderation integration.
 */

/**
 * Create a new chat message for a report.
 * @param {Object} payload - { reportId, message, senderId?, senderName, isAnonymous }
 * @param {Object} req - Express req for audit logging
 * @returns {Promise<ChatMessage>}
 */
const createMessage = async (payload, req) => {
  const { reportId, message, senderId, senderName, senderRole = 'user', isAnonymous = true } = payload;

  // Run moderation check
  const moderation = await evaluateModeration({ title: '', description: message });

  const chatMessage = new ChatMessage({
    reportId,
    senderId: senderId || null,
    senderName: senderName?.trim() || 'Anonymous',
    senderRole,
    message: message.trim(),
    isAnonymous,
    moderation: {
      provider: moderation.provider,
      status: moderation.status,
      flagged: moderation.flagged,
      score: moderation.score,
      reasons: moderation.reasons,
      confidence: moderation.confidence,
      flags: moderation.flags,
    },
  });

  await chatMessage.save();

  // Audit log
  await recordAuditLog({
    req,
    actor: senderId,
    actorRole: senderRole,
    action: 'chat_message_created',
    entityType: 'chat',
    entityId: chatMessage._id,
    metadata: {
      reportId,
      flagged: moderation.flagged,
      moderationScore: moderation.score,
      isAnonymous,
    },
  });

  return chatMessage;
};

/**
 * Get messages for a report (paginated, latest first).
 * @param {string} reportId
 * @param {Object} options - { page=1, limit=50, adminView=false }
 * @returns {Promise<{messages, pagination}>}
 */
const getMessagesByReport = async (reportId, options = {}) => {
  const { page = 1, limit = 50, adminView = false } = options;
  const skip = (page - 1) * limit;

  const filter = { reportId, deleted: false };
  const messages = await ChatMessage.find(filter)
    .populate('senderId', 'name role')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await ChatMessage.countDocuments(filter);

  // Anonymize for non-admins
  const sanitized = adminView
    ? messages
    : messages.map((msg) => ({
        ...msg,
        senderId: msg.isAnonymous ? null : msg.senderId,
        senderName: msg.isAnonymous ? 'Anonymous User' : msg.senderName,
      }));

  return {
    messages: sanitized.reverse(), // Chronological order
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
};

/**
 * Delete/flag a message (soft delete).
 * @param {string} messageId
 * @param {Object} req - For audit
 * @returns {Promise<void>}
 */
const deleteMessage = async (messageId, req) => {
  await ChatMessage.findByIdAndUpdate(messageId, { deleted: true });

  await recordAuditLog({
    req,
    actor: req.user._id,
    actorRole: req.user.role,
    action: 'chat_message_deleted',
    entityType: 'chat',
    entityId: messageId,
    metadata: { byAdmin: req.user.role === 'admin' },
  });
};

/**
 * Flag message for review.
 */
const flagMessage = async (messageId, reason, req) => {
  await ChatMessage.findByIdAndUpdate(messageId, {
    flagged: true,
    'moderation.reasons': reason,
  });

  await recordAuditLog({
    req,
    action: 'chat_message_flagged',
    entityType: 'chat',
    entityId: messageId,
    metadata: { reason },
  });
};

module.exports = {
  createMessage,
  getMessagesByReport,
  deleteMessage,
  flagMessage,
};

