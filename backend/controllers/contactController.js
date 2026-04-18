const EmergencyContact = require('../models/EmergencyContact');
const { createAuditLog } = require('../services/auditService');

const getEmergencyDirectory = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const skip = (page - 1) * limit;

    const filter = { active: true };
    if (req.query.state) filter.state = req.query.state;
    if (req.query.category) filter.category = req.query.category;
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { agency: { $regex: req.query.search, $options: 'i' } },
      ];
    }

    const [contacts, total] = await Promise.all([
      EmergencyContact.find(filter).sort({ state: 1, agency: 1 }).skip(skip).limit(limit),
      EmergencyContact.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      contacts,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching emergency contacts.' });
  }
};

const adminCreateEmergencyContact = async (req, res) => {
  try {
    const contact = await EmergencyContact.create(req.body);

    await createAuditLog({
      req,
      actor: req.user,
      action: 'emergency_contact.create',
      entityType: 'emergency_contact',
      entityId: contact._id,
      metadata: { state: contact.state, category: contact.category },
    });

    res.status(201).json({ success: true, message: 'Emergency contact created.', contact });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error creating contact.' });
  }
};

const adminUpdateEmergencyContact = async (req, res) => {
  try {
    const contact = await EmergencyContact.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!contact) return res.status(404).json({ success: false, message: 'Contact not found.' });

    await createAuditLog({
      req,
      actor: req.user,
      action: 'emergency_contact.update',
      entityType: 'emergency_contact',
      entityId: contact._id,
      metadata: { updates: Object.keys(req.body || {}) },
    });

    res.status(200).json({ success: true, message: 'Emergency contact updated.', contact });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error updating contact.' });
  }
};

const adminDeleteEmergencyContact = async (req, res) => {
  try {
    const contact = await EmergencyContact.findById(req.params.id);
    if (!contact) return res.status(404).json({ success: false, message: 'Contact not found.' });

    await contact.deleteOne();

    await createAuditLog({
      req,
      actor: req.user,
      action: 'emergency_contact.delete',
      entityType: 'emergency_contact',
      entityId: req.params.id,
      metadata: { state: contact.state, agency: contact.agency },
    });

    res.status(200).json({ success: true, message: 'Emergency contact deleted.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error deleting contact.' });
  }
};

module.exports = {
  getEmergencyDirectory,
  adminCreateEmergencyContact,
  adminUpdateEmergencyContact,
  adminDeleteEmergencyContact,
};
