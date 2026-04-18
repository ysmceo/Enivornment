const { getNewsBundle } = require('../services/newsService');

const getNews = async (req, res) => {
  try {
    const { ngState, ngCategory, limit, page } = req.query;

    const news = await getNewsBundle({ ngState, ngCategory, limit, page });

    res.status(200).json({
      success: true,
      news,
    });
  } catch (err) {
    console.error('[News] getNews error:', err.message);
    res.status(500).json({
      success: false,
      message: err.message || 'Unable to fetch news right now.',
    });
  }
};

module.exports = { getNews };