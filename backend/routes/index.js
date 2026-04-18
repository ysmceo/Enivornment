const express = require('express');

const authRoutes = require('./authRoutes');
const reportRoutes = require('./reportRoutes');
const adminRoutes = require('./adminRoutes');
const streamRoutes = require('./streamRoutes');
const contactRoutes = require('./contactRoutes');
const metaRoutes = require('./metaRoutes');
const chatRoutes = require('./chatRoutes');
const sosRoutes = require('./sosRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/reports', reportRoutes);
router.use('/admin', adminRoutes);
router.use('/streams', streamRoutes);
router.use('/emergency-contacts', contactRoutes);
router.use('/meta', metaRoutes);
router.use('/chat', chatRoutes);
router.use('/sos', sosRoutes);

module.exports = router;
