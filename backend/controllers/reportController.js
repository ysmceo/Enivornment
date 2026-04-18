const Report    = require('../models/Report');
const User      = require('../models/User');
const cloudinary = require('../config/cloudinary');
const { mapUploadedMedia, normalizeReportPayload } = require('../services/reportService');
const { evaluateModeration } = require('../services/moderationService');
const { computeRiskAndEscalation } = require('../services/escalationService');
const { sendHighPriorityIncidentAlerts } = require('../services/notificationService');
const { recordAuditLog } = require('../services/auditService');

// ─── CREATE REPORT ────────────────────────────────────────────────────────
/**
 * POST /api/reports
 * User must have a verified ID.
 * Accepts text fields + up to 10 media files via multipart/form-data.
 */
const createReport = async (req, res) => {
  try {
    const reportInput = normalizeReportPayload(req.body);
    const media = mapUploadedMedia(req.files || []);
    const moderation = await evaluateModeration({
      title: reportInput.title,
      description: reportInput.description,
    });
    const risk = computeRiskAndEscalation({
      severity: reportInput.severity,
      category: reportInput.category,
      moderationStatus: moderation.status,
    });
    const status = moderation.status === 'blocked' ? 'under_review' : 'pending';
    const priority = reportInput.severity === 'critical' ? 'critical' : risk.shouldEscalate ? 'high' : reportInput.severity || 'medium';

    const report = await Report.create({
      userId: req.user._id,
      ...reportInput,
      status,
      priority,
      media,
      mediaUrls: media.map((item) => item.url),
      submittedBy: req.user._id,
      riskScore: risk.riskScore,
      escalation: {
        escalated: risk.shouldEscalate,
        level: risk.level,
        escalatedAt: risk.shouldEscalate ? new Date() : null,
      },
      moderation: {
        provider: moderation.provider,
        status: moderation.status,
        flagged: moderation.flagged,
        score: moderation.score,
        reasons: moderation.reasons,
        confidence: moderation.confidence,
        flags: moderation.flags,
        reviewedAt: moderation.reviewedAt,
      },
      statusHistory: [{ status, changedBy: req.user._id, note: 'Report submitted' }],
    });

    await recordAuditLog({
      req,
      actor: req.user._id,
      actorRole: req.user.role,
      action: 'report_created',
      entityType: 'report',
      entityId: report._id,
      metadata: {
        category: report.category,
        state: report.state,
        severity: report.severity,
        riskScore: report.riskScore,
        moderationFlagged: report.moderation?.flagged || false,
        moderationScore: report.moderation?.score || 0,
      },
    });

    if (risk.shouldEscalate) {
      const adminUsers = await User.find({ role: 'admin', isActive: true }).select('_id');
      await sendHighPriorityIncidentAlerts({
        io: req.app.get('io'),
        report,
        adminUsers,
      });
    }

    res.status(201).json({ success: true, message: 'Report submitted successfully.', report });
  } catch (err) {
    console.error('[Reports] createReport error:', err.message);
    res.status(500).json({ success: false, message: 'Server error while submitting report.' });
  }
};

// ─── GET MY REPORTS ───────────────────────────────────────────────────────
/**
 * GET /api/reports/my
 * Returns all reports submitted by the authenticated user (paginated).
 */
const getMyReports = async (req, res) => {
  try {
    const page  = Math.max(parseInt(req.query.page)  || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const skip  = (page - 1) * limit;

    const filter = { submittedBy: req.user._id };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.state) filter.state = req.query.state;
    if (req.query.category) filter.category = req.query.category;
    if (req.query.severity) filter.severity = req.query.severity;

    const [reports, total] = await Promise.all([
      Report.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-adminNotes'), // Admin notes not visible to users
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

// ─── GET SINGLE REPORT ────────────────────────────────────────────────────
/**
 * GET /api/reports/:id
 * Returns a single report. Users can only view their own; admins can view all.
 */
const getReportById = async (req, res) => {
  try {
    const query = { _id: req.params.id };
    if (req.user.role !== 'admin') query.submittedBy = req.user._id;

    const report = await Report.findOne(query)
      .populate('submittedBy', 'name email')
      .populate('assignedTo', 'name email');

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found.' });
    }

    // Increment view counter without re-triggering hooks
    await Report.updateOne({ _id: report._id }, { $inc: { viewCount: 1 } });

    // Strip admin-only fields for regular users
    const data = report.toObject();
    if (req.user.role !== 'admin') delete data.adminNotes;

    res.status(200).json({ success: true, report: data });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── UPDATE REPORT ────────────────────────────────────────────────────────
/**
 * PUT /api/reports/:id
 * Users can update their own PENDING reports only (title, description, location).
 */
const updateReport = async (req, res) => {
  try {
    const report = await Report.findOne({ _id: req.params.id, submittedBy: req.user._id });
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found.' });
    }
    if (report.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Only pending reports can be edited.' });
    }

    const { title, description, incidentDate, category, state, severity } = req.body;
    if (title)        report.title        = title;
    if (description)  report.description  = description;
    if (incidentDate) report.incidentDate = incidentDate;
    if (category)     report.category     = category;
    if (state)        report.state        = state;
    if (severity)     report.severity     = severity;

    await report.save();

    await recordAuditLog({
      req,
      actor: req.user._id,
      actorRole: req.user.role,
      action: 'report_updated',
      entityType: 'report',
      entityId: report._id,
      metadata: { fields: Object.keys(req.body || {}) },
    });

    res.status(200).json({ success: true, message: 'Report updated.', report });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── DELETE REPORT ────────────────────────────────────────────────────────
/**
 * DELETE /api/reports/:id
 * Users can delete their own PENDING reports; also removes media from Cloudinary.
 */
const deleteReport = async (req, res) => {
  try {
    const report = await Report.findOne({ _id: req.params.id, submittedBy: req.user._id });
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found.' });
    }
    if (report.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Only pending reports can be deleted.' });
    }

    // Clean up Cloudinary files
    for (const item of report.media) {
      await cloudinary.uploader.destroy(item.publicId, { resource_type: item.resourceType }).catch(() => {});
    }

    await report.deleteOne();

    await recordAuditLog({
      req,
      actor: req.user._id,
      actorRole: req.user.role,
      action: 'report_deleted',
      entityType: 'report',
      entityId: report._id,
      metadata: { state: report.state, category: report.category },
    });

    res.status(200).json({ success: true, message: 'Report deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── MAP / ANALYTICS ─────────────────────────────────────────────────────
const getMapReports = async (req, res) => {
  try {
    const filter = {};
    if (req.query.state) filter.state = req.query.state;
    if (req.query.category) filter.category = req.query.category;
    if (req.query.severity) filter.severity = req.query.severity;
    if (req.query.status) filter.status = req.query.status;

    const reports = await Report.find(filter)
      .select('title category severity state location status priority riskScore createdAt')
      .sort({ createdAt: -1 })
      .limit(1000);

    res.status(200).json({ success: true, reports });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Could not fetch map reports.' });
  }
};

const getMapSummary = async (req, res) => {
  try {
    const [totalReports, highRiskCount, byState, byCategory, bySeverity] = await Promise.all([
      Report.countDocuments(),
      Report.countDocuments({ riskScore: { $gte: 75 } }),
      Report.aggregate([{ $group: { _id: '$state', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      Report.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      Report.aggregate([{ $group: { _id: '$severity', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    ]);

    res.status(200).json({
      success: true,
      summary: {
        totalReports,
        highRiskCount,
        byState,
        byCategory,
        bySeverity,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Could not fetch map summary.' });
  }
};

module.exports = {
  createReport,
  getMyReports,
  getReportById,
  updateReport,
  deleteReport,
  getMapReports,
  getMapSummary,
};
