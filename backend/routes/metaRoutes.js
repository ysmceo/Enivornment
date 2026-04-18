const express = require('express');
const { getPlatformMetadata } = require('../controllers/metaController');
const { getNews } = require('../controllers/newsController');
const { newsLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.get('/metadata', getPlatformMetadata);
router.get('/news', newsLimiter, getNews);

module.exports = router;
