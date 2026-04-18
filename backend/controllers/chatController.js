const ChatMessage = require('../models/ChatMessage');
const Report = require('../models/Report');
const { createMessage, getMessagesByReport, deleteMessage, flagMessage } = require('../services/chatService');

/**
 * POST /api/chat/:reportId/messages
 * Create new chat message for report (authenticated users only).
 */
const createChatMessage = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { message, isAnonymous = true } = req.body;

    // Verify report exists & user has access
    const report = await Report.findOne({
      _id: reportId,
      $or: [{ submittedBy: req.user._id }, { 'assignedTo': req.user._id }],
    });
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found or access denied.' });
    }

    const chatMessage = await createMessage({
      reportId,
      message,
      senderId: req.user._id,
      senderName: req.user.name,
      senderRole: req.user.role,
      isAnonymous,
    }, req);

    res.status(201).json({
      success: true,
      message: 'Chat message sent.',
      chatMessage,
    });
  } catch (err) {
    console.error('[Chat] create error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to send message.' });
  }
};

/**
 * GET /api/chat/:reportId
 * Get paginated messages for report.
 */
const getChatMessages = async (req, res) => {
  try {
    const { reportId } = req.params;
    const page = Math.max(1, parseInt(req.query.page || 1));
    const limit = Math.min(50, parseInt(req.query.limit || 20));
    const adminView = req.user.role === 'admin';

    // Verify access (owner/assigned/reported by)
    const report = await Report.findOne({
      _id: reportId,
      $or: [
        { submittedBy: req.user._id },
        { assignedTo: req.user._id },
        { status: { $in: ['public', 'investigating'] } }, // Public if open
      ],
    });
    if (!report) {
      return res.status(403).json({ success: false, message: 'No access to this chat.' });
    }

    const { messages, pagination } = await getMessagesByReport(reportId, { page, limit, adminView });

    res.status(200).json({
      success: true,
      messages,
      pagination,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch messages.' });
  }
};

/**
 * DELETE /api/chat/:messageId
 * Delete message (user deletes own, admin deletes any).
 */
const deleteChatMessage = async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await ChatMessage.findById(messageId).populate('senderId');
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found.' });
    }

    // Auth check: own message or admin
    if (message.senderId._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    await deleteMessage(messageId, req);

    res.status(200).json({ success: true, message: 'Message deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete message.' });
  }
};

/**
 * POST /api/chat/:messageId/flag
 * Flag message for review (admin only).
 */
const flagChatMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { reason } = req.body;

    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin only.' });
    }

    await flagMessage(messageId, reason, req);

    res.status(200).json({ success: true, message: 'Message flagged.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to flag message.' });
  }
};

module.exports = {
  createChatMessage,
  getChatMessages,
  deleteChatMessage,
  flagChatMessage,
};

