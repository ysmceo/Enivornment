const Report    = require('../models/Report');
const User      = require('../models/User');
const cloudinary = require('../config/cloudinary');
const { mapUploadedMedia, normalizeReportPayload } = require('../services/reportService');
const { evaluateModeration } = require('../services/moderationService');
const { computeRiskAndEscalation } = require('../services/escalationService');
const { sendHighPriorityIncidentAlerts } = require('../services/notificationService');
const { recordAuditLog } = require('../services/auditService');

const toDisplayStatus = (status) => {
  if (status === 'in_progress') return 'in progress';
  if (status === 'investigating') return 'under investigation';
  if (status === 'under_review') return 'under review';
  if (status === 'solved') return 'solved';
  return status;
};

const toTrackingPayload = (report) => ({
  _id: report._id,
  caseId: report.caseId,
  title: report.title,
  status: report.status,
  statusLabel: toDisplayStatus(report.status),
  state: report.state,
  category: report.category,
  incidentDate: report.incidentDate,
  experience: report.experience || null,
  createdAt: report.createdAt,
  updatedAt: report.updatedAt,
  statusHistory: report.statusHistory || [],
});

const COMPLETED_STATUSES = ['solved', 'resolved', 'closed'];

const notifyReportOwner = async ({ report, type, title, message, payload = {} }) => {
  try {
    const { queueNotification } = require('../services/notificationService');
    const notification = await queueNotification({
      userId: report.submittedBy,
      reportId: report._id,
      channel: 'system',
      type,
      title,
      message,
      payload,
    });

    const io = global.__io;
    if (io) {
      io.to(`user_${String(report.submittedBy)}`).emit('notification', {
        type: notification.type,
        title: notification.title,
        message: notification.message,
        payload: notification.payload,
      });
    }
  } catch {
    // Notification failures should not block core report workflow
  }
};

// ─── CREATE REPORT ────────────────────────────────────────────────────────
/**
 * POST /api/reports
 * User must have a verified ID.
 * Accepts text fields + up to 10 media files via multipart/form-data.
 */
const createReport = async (req, res) => {
  try {
    const reportInput = normalizeReportPayload(req.body);
    reportInput.reporterContact = {
      fullName: reportInput.reporterContact?.fullName || req.user?.name || null,
      phone: reportInput.reporterContact?.phone || req.user?.phone || null,
      email: (reportInput.reporterContact?.email || req.user?.email || null)?.toLowerCase() || null,
    };

    if (!reportInput.reporterContact?.email) {
      return res.status(422).json({
        success: false,
        message: 'Reporter email is required to track this case.',
        errors: [{ field: 'reporter.email', message: 'Reporter email is required to track this case.' }],
      });
    }

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
      statusHistory: [{ status, changedBy: req.user._id, note: 'Case submitted by reporter' }],
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

    res.status(201).json({
      success: true,
      message: `Report submitted successfully. Case ID: ${report.caseId}`,
      report,
      caseId: report.caseId,
    });
  } catch (err) {
    console.error('[Reports] createReport error:', err.message);
    res.status(500).json({ success: false, message: 'Server error while submitting report.' });
  }
};

// ─── TRACK REPORT BY CASE ID + EMAIL (PUBLIC) ───────────────────────────
/**
 * POST /api/reports/track
 * Allows tracking using case code and reporter email.
 */
const trackReportByCaseAndEmail = async (req, res) => {
  try {
    const caseId = String(req.body.caseId || '').trim().toUpperCase();
    const email = String(req.body.email || '').trim().toLowerCase();

    let report = await Report.findOne({ caseId, 'reporterContact.email': email })
      .select('-adminNotes')
      .populate('submittedBy', 'name email');

    if (!report) {
      const user = await User.findOne({ email }).select('_id');
      if (user) {
        report = await Report.findOne({ caseId, submittedBy: user._id })
          .select('-adminNotes')
          .populate('submittedBy', 'name email');
      }
    }

    if (!report) {
      return res.status(404).json({ success: false, message: 'No case found for the provided case ID and email.' });
    }

    const payload = toTrackingPayload(report);
    return res.status(200).json({
      success: true,
      report: payload,
      tracking: {
        caseId: payload.caseId,
        status: payload.status,
        statusLabel: payload.statusLabel,
        submittedAt: payload.createdAt,
        lastUpdatedAt: payload.updatedAt,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
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

// ─── TRACK REPORT BY CASE ID ─────────────────────────────────────────────
/**
 * GET /api/reports/track/:caseId
 * Returns report by caseId. Users can only access their own case; admins can access all.
 */
const trackReportByCaseId = async (req, res) => {
  try {
    const query = { caseId: req.params.caseId };
    if (req.user.role !== 'admin') query.submittedBy = req.user._id;

    const report = await Report.findOne(query)
      .populate('submittedBy', 'name email')
      .populate('assignedTo', 'name email');

    if (!report) {
      return res.status(404).json({ success: false, message: 'Case not found.' });
    }

    const data = report.toObject();
    if (req.user.role !== 'admin') delete data.adminNotes;

    res.status(200).json({
      success: true,
      report: toTrackingPayload(data),
      tracking: {
        caseId: data.caseId,
        status: data.status,
        statusLabel: toDisplayStatus(data.status),
        lastUpdatedAt: data.updatedAt,
        submittedAt: data.createdAt,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── SUBMIT USER CASE EXPERIENCE ──────────────────────────────────────────
/**
 * PATCH /api/reports/:id/experience
 * Reporter can share journey feedback once case is completed by admin.
 */
const submitReportExperience = async (req, res) => {
  try {
    const report = await Report.findOne({ _id: req.params.id, submittedBy: req.user._id });
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found.' });
    }

    if (!COMPLETED_STATUSES.includes(report.status)) {
      return res.status(400).json({
        success: false,
        message: 'You can share your experience only after the case is completed by admin.',
      });
    }

    const rating = Number(req.body.rating);
    const journey = String(req.body.journey || '').trim();

    report.experience = {
      rating,
      journey,
      submittedAt: new Date(),
    };

    await report.save();

    await recordAuditLog({
      req,
      actor: req.user._id,
      actorRole: req.user.role,
      action: 'report_experience_submitted',
      entityType: 'report',
      entityId: report._id,
      metadata: { caseId: report.caseId, rating },
    });

    return res.status(200).json({
      success: true,
      message: 'Thank you for sharing your case journey experience.',
      report,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
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

// ─── ADMIN REQUEST MORE EVIDENCE ─────────────────────────────────────────
/**
 * PATCH /api/reports/:id/request-evidence
 * Admin requests additional evidence from report owner.
 */
const requestMoreEvidence = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only admins can request more evidence.' });
    }

    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found.' });
    }

    const note = String(req.body.note || '').trim();
    const requestEntry = {
      note,
      requestedBy: req.user._id,
      requestedAt: new Date(),
      status: 'open',
    };

    report.evidenceRequests.push(requestEntry);
    report.statusHistory.push({
      status: report.status,
      changedBy: req.user._id,
      note: `Admin requested additional evidence: ${note}`,
    });
    await report.save();

    await recordAuditLog({
      req,
      actor: req.user._id,
      actorRole: req.user.role,
      action: 'report_additional_evidence_requested',
      entityType: 'report',
      entityId: report._id,
      metadata: { caseId: report.caseId, note },
    });

    await notifyReportOwner({
      report,
      type: 'report_evidence_requested',
      title: 'Additional evidence requested',
      message: `Admin requested more evidence for case ${report.caseId}.`,
      payload: {
        reportId: report._id,
        caseId: report.caseId,
        note,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Additional evidence request sent to user.',
      report,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── USER SUBMIT ADDITIONAL EVIDENCE ─────────────────────────────────────
/**
 * PATCH /api/reports/:id/add-evidence
 * Report owner uploads additional media in response to admin request.
 */
const submitAdditionalEvidence = async (req, res) => {
  try {
    const report = await Report.findOne({ _id: req.params.id, submittedBy: req.user._id });
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found.' });
    }

    const media = mapUploadedMedia(req.files || []);
    if (!media.length) {
      return res.status(400).json({ success: false, message: 'Please upload at least one evidence file.' });
    }

    const note = String(req.body.note || '').trim();
    report.media.push(...media);
    report.mediaUrls = report.media.map((item) => item.url);
    report.additionalEvidenceSubmissions.push({
      submittedBy: req.user._id,
      note,
      media,
      submittedAt: new Date(),
    });

    const openEvidenceRequest = [...(report.evidenceRequests || [])]
      .reverse()
      .find((entry) => entry.status === 'open');

    if (openEvidenceRequest) {
      openEvidenceRequest.status = 'fulfilled';
      openEvidenceRequest.fulfilledAt = new Date();
      openEvidenceRequest.fulfilledBy = req.user._id;
    }

    report.statusHistory.push({
      status: report.status,
      changedBy: req.user._id,
      note: note
        ? `User submitted additional evidence: ${note}`
        : 'User submitted additional evidence files.',
    });

    await report.save();

    await recordAuditLog({
      req,
      actor: req.user._id,
      actorRole: req.user.role,
      action: 'report_additional_evidence_submitted',
      entityType: 'report',
      entityId: report._id,
      metadata: {
        caseId: report.caseId,
        filesUploaded: media.length,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Additional evidence uploaded successfully.',
      report,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
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
  trackReportByCaseAndEmail,
  trackReportByCaseId,
  submitReportExperience,
  requestMoreEvidence,
  submitAdditionalEvidence,
  updateReport,
  deleteReport,
  getMapReports,
  getMapSummary,
};
