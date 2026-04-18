const { NIGERIA_STATES } = require('../utils/nigeria');

const NEWS_API_BASE_URL = process.env.NEWS_API_BASE_URL || 'https://newsapi.org/v2';
const NEWS_API_KEY = process.env.NEWS_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const NIGERIA_CATEGORIES = ['general', 'business', 'entertainment', 'health', 'science', 'sports', 'technology'];
const GLOBAL_WORLD_SOURCES = [
  'bbc-news',
  'cnn',
  'reuters',
  'al-jazeera-english',
  'associated-press',
  'the-guardian-uk',
  'the-washington-post',
].join(',');
const cache = new Map();
const inFlightByKey = new Map();
const lastRefreshAttemptByKey = new Map();
const CACHE_TTL_MS = 3 * 60 * 1000;
const CACHE_STALE_TTL_MS = 10 * 60 * 1000;
const REFRESH_THROTTLE_MS = 8000;
const GOOGLE_NEWS_RSS_BASE_URL = 'https://news.google.com/rss/search';

const FALLBACK_NEWS = {
  nigeria: [
    {
      title: 'Community safety taskforce expands patrol coverage in Lagos',
      description: 'Authorities announced wider neighborhood patrol hours to improve emergency response.',
      summary: 'Lagos safety teams increased patrol coverage to improve incident response and prevention.',
      summarySource: 'heuristic',
      url: 'https://example.com/nigeria-safety-lagos',
      imageUrl: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&q=80',
      source: 'Public Safety Desk',
      author: 'Newsroom',
      publishedAt: new Date().toISOString(),
    },
    {
      title: 'Abuja emergency hotline awareness campaign begins this week',
      description: 'Residents are being sensitized on faster reporting channels and verified response lines.',
      summary: 'Abuja launched emergency hotline awareness to speed up verified incident reporting.',
      summarySource: 'heuristic',
      url: 'https://example.com/abuja-hotline-awareness',
      imageUrl: 'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=800&q=80',
      source: 'Civic Alert NG',
      author: 'Editorial',
      publishedAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
    },
  ],
  world: [
    {
      title: 'Global emergency communications upgrades continue across major cities',
      description: 'Public safety agencies are investing in resilient communication systems.',
      summary: 'Cities worldwide are modernizing emergency communications for faster coordinated response.',
      summarySource: 'heuristic',
      url: 'https://example.com/world-emergency-comms',
      imageUrl: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=800&q=80',
      source: 'World Safety Wire',
      author: 'Desk',
      publishedAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    },
    {
      title: 'International collaboration improves digital evidence sharing',
      description: 'Cross-border initiatives are helping agencies process and verify incident media faster.',
      summary: 'International partnerships are improving secure digital evidence workflows.',
      summarySource: 'heuristic',
      url: 'https://example.com/world-digital-evidence',
      imageUrl: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=80',
      source: 'Global Response Journal',
      author: 'Analyst Desk',
      publishedAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    },
  ],
};

const cleanText = (value) => String(value || '').replace(/\s+/g, ' ').trim();

const buildGoogleNewsSearchUrl = ({ title, region = 'world' }) => {
  const query = cleanText(title) || (region === 'nigeria' ? 'Nigeria breaking news' : 'World breaking news');
  const gl = region === 'nigeria' ? 'NG' : 'US';
  const hl = region === 'nigeria' ? 'en-NG' : 'en-US';
  const ceid = region === 'nigeria' ? 'NG:en' : 'US:en';

  return `https://news.google.com/search?q=${encodeURIComponent(query)}&hl=${hl}&gl=${gl}&ceid=${ceid}`;
};

const isPlaceholderUrl = (value) => {
  const url = cleanText(value);
  if (!url) return true;

  try {
    const parsed = new URL(url);
    return /(^|\.)example\.com$/i.test(parsed.hostname);
  } catch {
    return true;
  }
};

const toReadableArticleUrl = ({ url, title, region }) => {
  if (!isPlaceholderUrl(url)) return cleanText(url);
  return buildGoogleNewsSearchUrl({ title, region });
};

const stripHtml = (value) => cleanText(String(value || '').replace(/<[^>]*>/g, ' '));

const decodeHtmlEntities = (value) => String(value || '')
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'")
  .replace(/&nbsp;/g, ' ');

const extractXmlTag = (xml, tagName) => {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const match = String(xml || '').match(regex);
  return match ? decodeHtmlEntities(cleanText(match[1])) : '';
};

const toIsoOrNull = (value) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const parseGoogleNewsRss = async (xml, limit) => {
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  const items = [];

  let match = itemRegex.exec(String(xml || ''));
  while (match && items.length < limit) {
    const itemXml = match[1];
    const title = extractXmlTag(itemXml, 'title');
    const url = extractXmlTag(itemXml, 'link');
    const publishedAt = extractXmlTag(itemXml, 'pubDate');
    const descriptionRaw = extractXmlTag(itemXml, 'description');
    const source = extractXmlTag(itemXml, 'source') || 'Google News';
    const description = stripHtml(descriptionRaw);

    const summaryPayload = await summarizeArticle({
      title,
      description,
      content: description,
      source: { name: source },
    });

    items.push({
      title,
      description,
      summary: summaryPayload.summary,
      summarySource: summaryPayload.summarySource,
      url,
      imageUrl: '',
      source,
      author: '',
      publishedAt: publishedAt ? toIsoOrNull(publishedAt) : null,
    });

    match = itemRegex.exec(String(xml || ''));
  }

  return items;
};

const fetchGoogleNewsRss = async ({ query, regionCode, language, limit }) => {
  const url = new URL(GOOGLE_NEWS_RSS_BASE_URL);
  url.searchParams.set('q', query);
  url.searchParams.set('hl', `${language}-${regionCode}`);
  url.searchParams.set('gl', regionCode);
  url.searchParams.set('ceid', `${regionCode}:${language}`);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Google News RSS request failed (${res.status}).`);
  const xml = await res.text();
  return parseGoogleNewsRss(xml, limit);
};

const heuristicSummary = (article) => {
  const source = cleanText(article?.source?.name);
  const content = cleanText(article?.description || article?.content || '');
  const firstSentence = content.split(/(?<=[.!?])\s+/)[0] || content;
  const trimmed = firstSentence.length > 180 ? `${firstSentence.slice(0, 177)}...` : firstSentence;
  if (!trimmed) {
    return `Latest update${source ? ` from ${source}` : ''}. Click to read full story.`;
  }
  return `${trimmed}${trimmed.endsWith('.') ? '' : '.'}`;
};

const aiSummary = async (article) => {
  const payload = {
    model: 'gpt-4o-mini',
    input: `Write a 1-sentence (max 24 words) neutral breaking-news summary.\nTitle: ${cleanText(article.title)}\nDescription: ${cleanText(article.description)}\nContent: ${cleanText(article.content)}`,
  };

  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error(`OpenAI summary failed: ${res.status}`);
  const data = await res.json();
  const out = cleanText(data?.output_text || '');
  if (!out) throw new Error('Empty OpenAI summary');
  return out;
};

const summarizeArticle = async (article) => {
  if (OPENAI_API_KEY && OPENAI_API_KEY !== 'replace_me_if_using_openai') {
    try {
      return { summary: await aiSummary(article), summarySource: 'ai' };
    } catch {
      // fallback below
    }
  }
  return { summary: heuristicSummary(article), summarySource: 'heuristic' };
};

const newsFetch = async ({ endpoint, query }) => {
  if (!NEWS_API_KEY || NEWS_API_KEY === 'replace_me_news_api_key') {
    throw new Error('NEWS_API_KEY is not configured on backend.');
  }

  const url = new URL(`${NEWS_API_BASE_URL}/${endpoint}`);
  Object.entries(query).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v).trim() !== '') url.searchParams.set(k, String(v));
  });
  url.searchParams.set('apiKey', NEWS_API_KEY);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`News API request failed (${res.status}).`);
  const data = await res.json();
  if (data.status !== 'ok') throw new Error(data.message || 'News API returned non-ok status.');
  return data.articles || [];
};

const normalizeArticle = async (article) => {
  const { summary, summarySource } = await summarizeArticle(article);
  return {
    title: cleanText(article.title),
    description: cleanText(article.description),
    summary,
    summarySource,
    url: cleanText(article.url),
    imageUrl: cleanText(article.urlToImage),
    source: cleanText(article?.source?.name),
    author: cleanText(article.author),
    publishedAt: article.publishedAt || null,
  };
};

const sanitizeArticleForReading = (article, region) => ({
  ...article,
  url: toReadableArticleUrl({ url: article.url, title: article.title, region }),
});

const resolveNigeriaCategory = (category) => {
  const c = cleanText(category).toLowerCase();
  if (!c || c === 'all') return undefined;
  return NIGERIA_CATEGORIES.includes(c) ? c : undefined;
};

const resolveWorldQuery = (category) => {
  if (!category) return undefined;
  return `${category} news`;
};

const resolveWorldRssQuery = (category) => {
  if (!category) return 'breaking world news';
  return `${category} breaking world news`;
};

const resolveNigeriaQuery = ({ state, category }) => {
  const parts = ['Nigeria'];
  if (state) parts.push(state);
  if (category) parts.push(category);
  parts.push('breaking news');
  return parts.join(' ');
};

const resolveNigeriaState = (state) => {
  const wanted = cleanText(state);
  if (!wanted || wanted.toLowerCase() === 'all') return undefined;
  const match = NIGERIA_STATES.find((s) => s.toLowerCase() === wanted.toLowerCase());
  return match || undefined;
};

const withMeta = (data, meta = {}) => ({
  ...data,
  requestMeta: {
    servedAt: new Date().toISOString(),
    ...meta,
  },
});

const getNewsBundle = async ({ ngState, ngCategory, limit = 8, page = 1 }) => {
  const cappedLimit = Math.max(3, Math.min(Number(limit) || 8, 60));
  const currentPage = Math.max(1, Number(page) || 1);
  const state = resolveNigeriaState(ngState);
  const category = resolveNigeriaCategory(ngCategory);

  const now = Date.now();
  const cacheKey = JSON.stringify({ state, category, cappedLimit, currentPage });
  const cached = cache.get(cacheKey);

  if (cached && cached.expiresAt > now) {
    return withMeta(cached.data, {
      cache: 'fresh',
      throttled: false,
      sourceMode: cached.data.sourceMode,
    });
  }

  if (inFlightByKey.has(cacheKey)) {
    return inFlightByKey.get(cacheKey);
  }

  const lastAttempt = lastRefreshAttemptByKey.get(cacheKey) || 0;
  if (cached && now - lastAttempt < REFRESH_THROTTLE_MS) {
    return withMeta(cached.data, {
      cache: cached.expiresAt > now ? 'fresh' : 'stale',
      throttled: true,
      sourceMode: cached.data.sourceMode,
    });
  }

  lastRefreshAttemptByKey.set(cacheKey, now);

  const fetchPromise = (async () => {

    let worldRaw = [];
    let nigeriaRaw = [];
    let worldRss = [];
    let nigeriaRss = [];
    let sourceMode = 'live';
    let usingFallback = false;

    try {
      if (!NEWS_API_KEY || NEWS_API_KEY === 'replace_me_news_api_key') {
        [worldRss, nigeriaRss] = await Promise.all([
          fetchGoogleNewsRss({
            query: resolveWorldRssQuery(category),
            regionCode: 'US',
            language: 'en',
            limit: cappedLimit,
          }),
          fetchGoogleNewsRss({
            query: resolveNigeriaQuery({ state, category }),
            regionCode: 'NG',
            language: 'en',
            limit: cappedLimit,
          }),
        ]);
        sourceMode = 'rss';
      } else {
        [worldRaw, nigeriaRaw] = await Promise.all([
          newsFetch({
            endpoint: 'top-headlines',
            query: {
              sources: GLOBAL_WORLD_SOURCES,
              q: resolveWorldQuery(category),
              language: 'en',
              pageSize: cappedLimit,
              page: currentPage,
            },
          }),
          newsFetch({
            endpoint: 'top-headlines',
            query: {
              country: 'ng',
              category,
              q: state,
              pageSize: cappedLimit,
              page: currentPage,
            },
          }),
        ]);
        sourceMode = 'live';
      }
    } catch (err) {
      console.warn('[News] Primary provider failed, attempting RSS fallback:', err.message);
      try {
        [worldRss, nigeriaRss] = await Promise.all([
          fetchGoogleNewsRss({
            query: resolveWorldRssQuery(category),
            regionCode: 'US',
            language: 'en',
            limit: cappedLimit,
          }),
          fetchGoogleNewsRss({
            query: resolveNigeriaQuery({ state, category }),
            regionCode: 'NG',
            language: 'en',
            limit: cappedLimit,
          }),
        ]);
        sourceMode = 'rss';
      } catch (rssErr) {
        console.warn('[News] Falling back to sample dataset:', rssErr.message);
        usingFallback = true;
        sourceMode = 'fallback';
      }
    }

    const [world, nigeria] = usingFallback
      ? [FALLBACK_NEWS.world.slice(0, cappedLimit), FALLBACK_NEWS.nigeria.slice(0, cappedLimit)]
      : sourceMode === 'rss'
      ? [worldRss.slice(0, cappedLimit), nigeriaRss.slice(0, cappedLimit)]
      : await Promise.all([
        Promise.all(worldRaw.slice(0, cappedLimit).map(normalizeArticle)),
        Promise.all(nigeriaRaw.slice(0, cappedLimit).map(normalizeArticle)),
      ]);

    let worldReadable = world.map((article) => sanitizeArticleForReading(article, 'world'));
    let nigeriaReadable = nigeria.map((article) => sanitizeArticleForReading(article, 'nigeria'));

    if (sourceMode === 'live' && (!worldReadable.length || !nigeriaReadable.length)) {
      try {
        const [worldBackfill, nigeriaBackfill] = await Promise.all([
          worldReadable.length
            ? Promise.resolve([])
            : fetchGoogleNewsRss({
                query: resolveWorldRssQuery(category),
                regionCode: 'US',
                language: 'en',
                limit: cappedLimit,
              }),
          nigeriaReadable.length
            ? Promise.resolve([])
            : fetchGoogleNewsRss({
                query: resolveNigeriaQuery({ state, category }),
                regionCode: 'NG',
                language: 'en',
                limit: cappedLimit,
              }),
        ]);

        if (!worldReadable.length && worldBackfill.length) {
          worldReadable = worldBackfill
            .slice(0, cappedLimit)
            .map((article) => sanitizeArticleForReading(article, 'world'));
        }

        if (!nigeriaReadable.length && nigeriaBackfill.length) {
          nigeriaReadable = nigeriaBackfill
            .slice(0, cappedLimit)
            .map((article) => sanitizeArticleForReading(article, 'nigeria'));
        }

        if (worldBackfill.length || nigeriaBackfill.length) {
          sourceMode = 'hybrid';
        }
      } catch (backfillErr) {
        console.warn('[News] Live empty-result RSS backfill failed:', backfillErr.message);
      }
    }

    const ticker = [...nigeriaReadable, ...worldReadable]
      .filter((a) => a.title)
      .sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0))
      .slice(0, 10)
      .map((a) => ({ title: a.title, url: a.url, source: a.source }));

    const data = {
      generatedAt: new Date().toISOString(),
      sourceMode: usingFallback ? 'fallback' : sourceMode,
      filters: {
        nigeriaState: state || 'All',
        nigeriaCategory: category || 'all',
      },
      pagination: {
        page: currentPage,
        limit: cappedLimit,
      },
      nigeria: nigeriaReadable,
      world: worldReadable,
      ticker,
      categories: ['all', ...NIGERIA_CATEGORIES],
      states: ['All', ...NIGERIA_STATES],
    };

    cache.set(cacheKey, {
      data,
      expiresAt: Date.now() + CACHE_TTL_MS,
      staleUntil: Date.now() + CACHE_STALE_TTL_MS,
    });

    return withMeta(data, {
      cache: 'miss',
      throttled: false,
      sourceMode: data.sourceMode,
    });
  })();

  inFlightByKey.set(cacheKey, fetchPromise);

  try {
    return await fetchPromise;
  } catch (err) {
    if (cached && cached.staleUntil > Date.now()) {
      return withMeta(cached.data, {
        cache: 'stale',
        throttled: false,
        sourceMode: cached.data.sourceMode,
        warning: 'Serving stale news due to provider error.',
        providerError: err.message,
      });
    }
    throw err;
  } finally {
    inFlightByKey.delete(cacheKey);
  }
};

module.exports = { getNewsBundle };