const User      = require('../models/User');
const Report    = require('../models/Report');
const AuditLog = require('../models/AuditLog');
const cloudinary = require('../config/cloudinary');
const { decrypt } = require('../utils/encryption');
const { recordAuditLog } = require('../services/auditService');
const { queueNotification } = require('../services/notificationService');
const { upsertLawEnforcementCase } = require('../services/lawEnforcementService');

// ─── DASHBOARD STATS ──────────────────────────────────────────────────────
/**
 * GET /api/admin/stats
 */
const getStats = async (req, res) => {
  try {
    const [
      totalUsers,
      totalReports,
      pendingReports,
      resolvedReports,
      pendingVerifications,
      activeStreams,
      highRiskReports,
      escalatedReports,
    ] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      Report.countDocuments(),
      Report.countDocuments({ status: 'pending' }),
      Report.countDocuments({ status: 'resolved' }),
      User.countDocuments({ idVerificationStatus: 'pending' }),
      require('../models/Stream').countDocuments({ status: 'active' }),
      Report.countDocuments({ riskScore: { $gte: 75 } }),
      Report.countDocuments({ 'escalation.escalated': true }),
    ]);

    // Reports in last 7 days
    const since7days  = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentCount = await Report.countDocuments({ createdAt: { $gte: since7days } });

    // Category breakdown
    const byCategory = await Report.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Status breakdown
    const byStatus = await Report.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        totalReports,
        pendingReports,
        resolvedReports,
        pendingVerifications,
        activeStreams,
        highRiskReports,
        escalatedReports,
        recentReports: recentCount,
        reportsByCategory: byCategory,
        reportsByStatus: byStatus,
      },
    });
  } catch (err) {
    console.error('[Admin] getStats error:', err.message);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── ALL REPORTS ──────────────────────────────────────────────────────────
/**
 * GET /api/admin/reports
 */
const getAllReports = async (req, res) => {
  try {
    const page     = Math.max(parseInt(req.query.page)  || 1, 1);
    const limit    = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip     = (page - 1) * limit;
    const filter   = {};

    if (req.query.status)   filter.status   = req.query.status;
    if (req.query.category) filter.category = req.query.category;
    if (req.query.search) {
      filter.$or = [
        { title:       { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } },
      ];
    }

    const [reports, total] = await Promise.all([
      Report.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('submittedBy', 'name email idVerificationStatus')
        .populate('assignedTo',  'name email'),
      Report.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      reports,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── UPDATE REPORT STATUS ─────────────────────────────────────────────────
/**
 * PATCH /api/admin/reports/:id/status
 */
const updateReportStatus = async (req, res) => {
  try {
    const { status, adminNotes, rejectionReason, priority, assignedTo } = req.body;

    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ success: false, message: 'Report not found.' });

    report.status = status;
    if (adminNotes)       report.adminNotes       = adminNotes;
    if (rejectionReason)  report.rejectionReason  = rejectionReason;
    if (priority)         report.priority         = priority;
    if (assignedTo)       report.assignedTo       = assignedTo;
    if (report.moderation?.flagged) report.moderation.reviewedByAdmin = true;

    report.statusHistory.push({
      status,
      changedBy: req.user._id,
      note: adminNotes || `Status changed to ${status}`,
    });

    await report.save();

    const integrationSync = await upsertLawEnforcementCase({
      report,
      actor: req.user,
    });

    await recordAuditLog({
      req,
      actor: req.user._id,
      actorRole: req.user.role,
      action: 'report_status_updated',
      entityType: 'report',
      entityId: report._id,
      metadata: {
        status,
        priority: priority || report.priority,
        lawEnforcementSync: integrationSync,
      },
    });

    const notification = await queueNotification({
      userId: report.submittedBy,
      reportId: report._id,
      channel: 'in_app',
      type: 'report_status_update',
      title: 'Report status updated',
      message: `Your report is now marked as ${status}.`,
      payload: { reportId: report._id, status, priority: report.priority },
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${String(report.submittedBy)}`).emit('notification', {
        type: notification.type,
        title: notification.title,
        message: notification.message,
        payload: notification.payload,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Report status updated.',
      report,
      integration: integrationSync,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── ADMIN DELETE REPORT ─────────────────────────────────────────────────
/**
 * DELETE /api/admin/reports/:id
 */
const adminDeleteReport = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ success: false, message: 'Report not found.' });

    for (const item of report.media) {
      await cloudinary.uploader.destroy(item.publicId, { resource_type: item.resourceType }).catch(() => {});
    }
    await report.deleteOne();

    await recordAuditLog({
      req,
      actor: req.user._id,
      actorRole: req.user.role,
      action: 'report_deleted_by_admin',
      entityType: 'report',
      entityId: report._id,
      metadata: { state: report.state, category: report.category },
    });

    res.status(200).json({ success: true, message: 'Report deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── ALL USERS ────────────────────────────────────────────────────────────
/**
 * GET /api/admin/users
 */
const getAllUsers = async (req, res) => {
  try {
    const page  = Math.max(parseInt(req.query.page)  || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip  = (page - 1) * limit;
    const filter = { role: 'user' };

    if (req.query.verificationStatus) filter.idVerificationStatus = req.query.verificationStatus;
    if (req.query.search) {
      filter.$or = [
        { name:  { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      users,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── GET SINGLE USER ──────────────────────────────────────────────────────
/**
 * GET /api/admin/users/:id
 */
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    // Attach report count
    const reportCount = await Report.countDocuments({ submittedBy: user._id });
    res.status(200).json({ success: true, user, reportCount });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── TOGGLE USER STATUS ───────────────────────────────────────────────────
/**
 * PATCH /api/admin/users/:id/toggle-status
 */
const toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    if (user.role === 'admin') return res.status(400).json({ success: false, message: 'Cannot deactivate admin accounts.' });

    user.isActive = !user.isActive;
    await user.save({ validateBeforeSave: false });

    await recordAuditLog({
      req,
      actor: req.user._id,
      actorRole: req.user.role,
      action: 'user_status_toggled',
      entityType: 'user',
      entityId: user._id,
      metadata: { isActive: user.isActive },
    });

    res.status(200).json({
      success: true,
      message: `User ${user.isActive ? 'activated' : 'deactivated'}.`,
      isActive: user.isActive,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── VERIFY USER ID ───────────────────────────────────────────────────────
/**
 * GET /api/admin/users/:id/government-id
 * Returns decrypted Cloudinary URL so admin can view the ID document.
 */
const getGovernmentIdUrl = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    if (!user.governmentIdUrl) return res.status(404).json({ success: false, message: 'No ID uploaded.' });

    const url = decrypt(user.governmentIdUrl);
    res.status(200).json({ success: true, url });
  } catch (err) {
    console.error('[Admin] getGovernmentIdUrl error:', err.message);
    res.status(500).json({ success: false, message: 'Could not retrieve ID.' });
  }
};

/**
 * PATCH /api/admin/users/:id/verify-id
 * Sets idVerificationStatus to 'verified' or 'rejected'.
 */
const verifyGovernmentId = async (req, res) => {
  try {
    const { action, rejectionReason } = req.body; // action: 'approve' | 'reject'
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Action must be "approve" or "reject".' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    user.idVerificationStatus = action === 'approve' ? 'verified' : 'rejected';
    user.isVerified           = action === 'approve';
    user.idRejectionReason    = action === 'reject' ? (rejectionReason || 'ID rejected.') : null;
    await user.save({ validateBeforeSave: false });

    await recordAuditLog({
      req,
      actor: req.user._id,
      actorRole: req.user.role,
      action: 'government_id_reviewed',
      entityType: 'user',
      entityId: user._id,
      metadata: { action, idVerificationStatus: user.idVerificationStatus },
    });

    res.status(200).json({
      success: true,
      message: `ID ${action === 'approve' ? 'verified' : 'rejected'}.`,
      idVerificationStatus: user.idVerificationStatus,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── AUDIT LOGS ───────────────────────────────────────────────────────────
/**
 * GET /api/admin/audit-logs
 */
const getAuditLogs = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 25, 100);
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.actorRole) filter.actorRole = req.query.actorRole;
    if (req.query.action) filter.action = req.query.action;
    if (req.query.entityType) filter.entityType = req.query.entityType;

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('actor', 'name email role'),
      AuditLog.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      logs,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Could not fetch audit logs.' });
  }
};

module.exports = {
  getStats,
  getAllReports,
  updateReportStatus,
  adminDeleteReport,
  getAllUsers,
  getUserById,
  toggleUserStatus,
  getGovernmentIdUrl,
  verifyGovernmentId,
  getAuditLogs,
};
