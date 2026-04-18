const AuditLog = require('../models/AuditLog');

const recordAuditLog = async ({
  req,
  actor = null,
  actorRole = 'system',
  action,
  entityType,
  entityId = null,
  metadata = {},
}) => {
  try {
    const resolvedActorId = actor && actor._id ? actor._id : actor || null;
    const resolvedActorRole = actor?.role || actorRole || 'anonymous';

    await AuditLog.create({
      actor: resolvedActorId,
      actorRole: resolvedActorRole,
      action,
      entityType,
      entityId,
      ipAddress: req?.ip || req?.headers?.['x-forwarded-for'] || null,
      userAgent: req?.headers?.['user-agent'] || null,
      metadata,
    });
  } catch (err) {
    console.error('[Audit] Failed to write audit log:', err.message);
  }
};

const createAuditLog = recordAuditLog;

module.exports = { recordAuditLog, createAuditLog };
