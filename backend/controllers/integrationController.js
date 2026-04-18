const { recordAuditLog } = require('../services/auditService');

const verifyInboundIntegrationKey = (req) => {
  const expected = process.env.INTEGRATION_WEBHOOK_KEY;
  if (!expected) return false;

  const incoming = req.header('x-integration-key');
  return Boolean(incoming) && incoming === expected;
};

const ingestLawEnforcementCaseUpdate = async (req, res) => {
  try {
    if (!verifyInboundIntegrationKey(req)) {
      return res.status(401).json({ success: false, message: 'Unauthorized integration key.' });
    }

    const payload = req.body || {};

    await recordAuditLog({
      req,
      actor: null,
      actorRole: 'system',
      action: 'law_enforcement.case_update_received',
      entityType: 'system',
      entityId: payload?.reportId || null,
      metadata: {
        source: 'law_enforcement',
        reportId: payload?.reportId,
        remoteCaseId: payload?.caseId || payload?.remoteCaseId || null,
        status: payload?.status || null,
      },
    });

    return res.status(202).json({
      success: true,
      message: 'Integration payload accepted.',
      acceptedAt: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to process integration payload.' });
  }
};

module.exports = {
  ingestLawEnforcementCaseUpdate,
};
