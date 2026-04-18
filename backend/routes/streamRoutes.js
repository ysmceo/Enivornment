const express = require('express');
const {
  startStream, endStream, getActiveStreams, getStreamById, getMyStreams,
} = require('../controllers/streamController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/',        getActiveStreams);
router.get('/my',      getMyStreams);
router.get('/:id',     getStreamById);
router.post('/',       startStream);
router.patch('/:id/end', endStream);

module.exports = router;
