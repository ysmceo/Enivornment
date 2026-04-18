const EmergencyContact = require('../models/EmergencyContact');
const { recordAuditLog } = require('../services/auditService');

const getEmergencyContacts = async (req, res) => {
  try {
    const { state, type, verifiedOnly = 'true' } = req.query;
    const filter = {};

    if (state) filter.state = state;
    if (type) filter.type = type;
    if (verifiedOnly === 'true') filter.isVerifiedOfficial = true;

    const contacts = await EmergencyContact.find(filter).sort({ state: 1, type: 1, agencyName: 1 });
    res.status(200).json({ success: true, contacts });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Could not fetch emergency contacts.' });
  }
};

const adminCreateEmergencyContact = async (req, res) => {
  try {
    const contact = await EmergencyContact.create({
      ...req.body,
      updatedBy: req.user._id,
      lastVerifiedAt: req.body.isVerifiedOfficial ? new Date() : null,
    });

    await recordAuditLog({
      req,
      actor: req.user._id,
      actorRole: req.user.role,
      action: 'emergency_contact_created',
      entityType: 'emergency_contact',
      entityId: contact._id,
      metadata: { state: contact.state, type: contact.type },
    });

    res.status(201).json({ success: true, contact });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Could not create emergency contact.' });
  }
};

const adminUpdateEmergencyContact = async (req, res) => {
  try {
    const update = { ...req.body, updatedBy: req.user._id };
    if (Object.prototype.hasOwnProperty.call(req.body, 'isVerifiedOfficial')) {
      update.lastVerifiedAt = req.body.isVerifiedOfficial ? new Date() : null;
    }

    const contact = await EmergencyContact.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    });

    if (!contact) return res.status(404).json({ success: false, message: 'Contact not found.' });

    await recordAuditLog({
      req,
      actor: req.user._id,
      actorRole: req.user.role,
      action: 'emergency_contact_updated',
      entityType: 'emergency_contact',
      entityId: contact._id,
      metadata: { state: contact.state, type: contact.type },
    });

    res.status(200).json({ success: true, contact });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Could not update emergency contact.' });
  }
};

const adminDeleteEmergencyContact = async (req, res) => {
  try {
    const contact = await EmergencyContact.findById(req.params.id);
    if (!contact) return res.status(404).json({ success: false, message: 'Contact not found.' });

    await contact.deleteOne();

    await recordAuditLog({
      req,
      actor: req.user._id,
      actorRole: req.user.role,
      action: 'emergency_contact_deleted',
      entityType: 'emergency_contact',
      entityId: req.params.id,
      metadata: { state: contact.state, type: contact.type },
    });

    res.status(200).json({ success: true, message: 'Emergency contact deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Could not delete emergency contact.' });
  }
};

module.exports = {
  getEmergencyContacts,
  adminCreateEmergencyContact,
  adminUpdateEmergencyContact,
  adminDeleteEmergencyContact,
};
