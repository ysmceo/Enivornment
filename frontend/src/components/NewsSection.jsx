import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  Clock3,
  Loader2,
  RefreshCcw,
} from 'lucide-react'
import { newsService } from '../services/newsService'

const POLL_INTERVAL_MS = 60000
const INITIAL_LIMIT = 12
const LOAD_MORE_STEP = 8
const MAX_LIMIT = 60
const LAST_READING_ARTICLE_STORAGE_KEY = 'last_reading_article_v1'
const CATEGORY_ORDER = ['all', 'general', 'business', 'entertainment', 'health', 'science', 'sports', 'technology']

const fallbackImage = (region) =>
  region === 'nigeria'
    ? 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=80'
    : 'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=800&q=80'

const formatCategory = (value = 'all') => {
  if (!value || value === 'all') return 'All Categories'
  return value[0].toUpperCase() + value.slice(1)
}

const formatTimestamp = (isoString) => {
  if (!isoString) return 'Just now'

  const then = new Date(isoString).getTime()
  if (Number.isNaN(then)) return 'Just now'

  const diffMs = Date.now() - then
  const minutes = Math.floor(Math.abs(diffMs) / (1000 * 60))

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`

  return new Date(isoString).toLocaleString()
}

function NewsSkeletonCard() {
  return (
    <article className="card p-4 animate-pulse" aria-hidden="true">
      <div className="h-40 rounded-lg bg-slate-200 dark:bg-slate-700 mb-3" />
      <div className="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
      <div className="h-4 w-4/5 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
      <div className="h-3 w-full bg-slate-200 dark:bg-slate-700 rounded mb-1" />
      <div className="h-3 w-2/3 bg-slate-200 dark:bg-slate-700 rounded" />
    </article>
  )
}

function ArticleCard({ article }) {
  const readerTo = {
    pathname: '/news/read',
    search: `?url=${encodeURIComponent(article.url || '')}&title=${encodeURIComponent(article.title || '')}&source=${encodeURIComponent(article.source || '')}&publishedAt=${encodeURIComponent(article.publishedAt || '')}&region=${encodeURIComponent(article.region || 'world')}`,
  }

  return (
    <Link
      to={readerTo}
      state={{ article, backTo: '/#news' }}
      className="card-hover p-4 block focus:outline-none focus:ring-2 focus:ring-indigo-500"
      aria-label={`Open article: ${article.title}`}
    >
      <img
        src={article.imageUrl || fallbackImage(article.region)}
        alt={article.title || 'News article'}
        className="w-full h-40 object-cover rounded-lg mb-3"
        loading="lazy"
      />

      <div className="flex items-center justify-between gap-2 mb-2">
        <span
          className={`text-[11px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${
            article.region === 'nigeria'
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
          }`}
        >
          {article.region === 'nigeria' ? 'Nigeria' : 'World'}
        </span>
        <span className="text-[11px] text-slate-500 dark:text-slate-400 inline-flex items-center gap-1">
          <Clock3 className="w-3 h-3" /> {formatTimestamp(article.publishedAt)}
        </span>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1">{article.source || 'News Source'}</p>
      <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2">{article.title}</h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-3">{article.summary || article.description}</p>
    </Link>
  )
}

export default function NewsSection() {
  const requestSeqRef = useRef(0)
  const [newsLoading, setNewsLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [newsError, setNewsError] = useState('')
  const [ngStateFilter, setNgStateFilter] = useState('All')
  const [ngCategoryFilter, setNgCategoryFilter] = useState('all')
  const [limit, setLimit] = useState(INITIAL_LIMIT)
  const [resumePayload, setResumePayload] = useState(null)

  const [newsData, setNewsData] = useState({
    nigeria: [],
    world: [],
    ticker: [],
    states: ['All'],
    categories: ['all'],
    sourceMode: 'live',
    generatedAt: null,
    requestMeta: null,
  })

  const visibleCategories = useMemo(() => {
    const fromApi = (newsData.categories || []).map((c) => String(c).toLowerCase())
    const available = new Set([...CATEGORY_ORDER, ...fromApi])
    return CATEGORY_ORDER.filter((category) => available.has(category))
  }, [newsData.categories])

  const fetchNews = useCallback(
    async ({ withLoader = true, force = false, params } = {}) => {
      const requestSeq = ++requestSeqRef.current
      try {
        if (withLoader) setNewsLoading(true)
        setNewsError('')

        const resolvedParams = params || {
          ngState: ngStateFilter,
          ngCategory: ngCategoryFilter,
          limit,
        }

        const res = await newsService.getNews(resolvedParams, { force })

        if (requestSeq !== requestSeqRef.current) return
        setNewsData(res.data.news)
      } catch (err) {
        if (requestSeq !== requestSeqRef.current) return
        setNewsError(err.response?.data?.message || 'Unable to load live news right now. Please try again.')
      } finally {
        if (requestSeq !== requestSeqRef.current) return
        setNewsLoading(false)
        setLoadingMore(false)
      }
    },
    [ngStateFilter, ngCategoryFilter, limit]
  )

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetchNews({
        withLoader: true,
        params: {
          ngState: ngStateFilter,
          ngCategory: ngCategoryFilter,
          limit,
        },
      })
    }, 220)

    return () => window.clearTimeout(timeoutId)
  }, [fetchNews, ngStateFilter, ngCategoryFilter, limit])

  useEffect(() => {
    const id = setInterval(() => {
      fetchNews({
        withLoader: false,
        params: {
          ngState: ngStateFilter,
          ngCategory: ngCategoryFilter,
          limit,
        },
      })
    }, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [fetchNews, ngStateFilter, ngCategoryFilter, limit])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LAST_READING_ARTICLE_STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (!parsed?.article?.title) return
      setResumePayload(parsed)
    } catch {
      // ignore read errors
    }
  }, [])

  const mergedArticles = useMemo(() => {
    const nigeria = (newsData.nigeria || []).map((item) => ({ ...item, region: 'nigeria' }))
    const world = (newsData.world || []).map((item) => ({ ...item, region: 'world' }))

    return [...nigeria, ...world]
      .filter((a) => a.title && a.url)
      .sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0))
  }, [newsData.nigeria, newsData.world])

  const shownArticles = mergedArticles.slice(0, limit)

  const canLoadMore =
    !newsLoading &&
    !loadingMore &&
    limit < MAX_LIMIT &&
    shownArticles.length < mergedArticles.length

  const moreNewsHref = `/news/${encodeURIComponent(ngCategoryFilter || 'all')}?state=${encodeURIComponent(ngStateFilter || 'All')}`

  return (
    <section id="news" className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50/90 dark:bg-slate-900/70 backdrop-blur">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 mb-6">
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">Latest News by Category</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Simple, clean updates across Nigeria and world headlines.
            </p>
            {newsData.sourceMode === 'rss' && (
              <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-2 font-semibold">
                Live mode: Google News RSS stream.
              </p>
            )}
            {newsData.sourceMode === 'hybrid' && (
              <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-2 font-semibold">
                Live mode with RSS backfill for missing regions.
              </p>
            )}
            {newsData.sourceMode === 'fallback' && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 font-semibold">
                Temporary sample mode. Live sources are currently unavailable.
              </p>
            )}
            {(newsData.requestMeta?.cache === 'stale' || newsData.requestMeta?.throttled) && (
              <div className="mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                {newsData.requestMeta?.cache === 'stale' ? 'Serving cached headlines' : 'Using cached response'}
              </div>
            )}
            {!!newsData.requestMeta?.warning && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 font-semibold">
                {newsData.requestMeta.warning}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button type="button" onClick={() => fetchNews({ withLoader: true, force: true })} className="btn-secondary text-sm" aria-label="Refresh news now">
              <RefreshCcw className="w-4 h-4" /> Refresh
            </button>
            <Link to="/news/all?state=All" className="btn-secondary text-sm">
              All Categories
            </Link>
            <Link to={moreNewsHref} className="btn-primary text-sm">
              Read & Study More
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 mb-6">
          <select
            className="select text-sm lg:col-span-2"
            value={ngStateFilter}
            onChange={(e) => {
              setLimit(INITIAL_LIMIT)
              setNgStateFilter(e.target.value)
            }}
            aria-label="Filter by Nigerian state"
          >
            {(newsData.states || ['All']).map((state) => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>

          <select
            className="select text-sm"
            value={ngCategoryFilter}
            onChange={(e) => {
              setLimit(INITIAL_LIMIT)
              setNgCategoryFilter(e.target.value)
            }}
            aria-label="Filter by category"
          >
            {(newsData.categories || ['all']).map((category) => (
              <option key={category} value={category}>{formatCategory(category)}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-2 mb-6" role="tablist" aria-label="News categories">
          {visibleCategories.map((category) => {
            const active = ngCategoryFilter === category
            return (
              <button
                key={category}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  if (active) return
                  setLimit(INITIAL_LIMIT)
                  setNgCategoryFilter(category)
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                  active
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {formatCategory(category)}
              </button>
            )
          })}
        </div>

        <div>
        {!!resumePayload?.article && Number(resumePayload?.progress || 0) > 0 && Number(resumePayload?.progress || 0) < 100 && (
          <div className="card p-4 mb-6 border-indigo-200/70 dark:border-indigo-800/60 bg-indigo-50/70 dark:bg-indigo-900/20">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wider font-extrabold text-indigo-700 dark:text-indigo-300">Continue Reading</p>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mt-1 line-clamp-1">{resumePayload.article.title}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Progress: {Math.round(Number(resumePayload.progress) || 0)}%</p>
              </div>

              <Link
                to={{
                  pathname: '/news/read',
                  search: `?url=${encodeURIComponent(resumePayload.article.url || '')}&title=${encodeURIComponent(resumePayload.article.title || '')}&source=${encodeURIComponent(resumePayload.article.source || '')}&publishedAt=${encodeURIComponent(resumePayload.article.publishedAt || '')}&region=${encodeURIComponent(resumePayload.article.region || 'world')}&summary=${encodeURIComponent(resumePayload.article.summary || '')}&description=${encodeURIComponent(resumePayload.article.description || '')}&imageUrl=${encodeURIComponent(resumePayload.article.imageUrl || '')}`,
                }}
                state={{ article: resumePayload.article, backTo: resumePayload.backTo || '/#news' }}
                className="btn-primary text-sm"
              >
                Resume
              </Link>
            </div>
          </div>
        )}

        {newsError && (
          <div className="mb-6 rounded-xl border border-red-300/60 dark:border-red-800/60 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300 flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {newsError}</span>
            <button type="button" className="btn-secondary text-xs" onClick={() => fetchNews({ withLoader: true, force: true })}>Retry</button>
          </div>
        )}

        {newsLoading ? (
          <div>
            <div className="card p-5 mb-6 animate-pulse" aria-hidden="true">
              <div className="h-48 rounded-xl bg-slate-200 dark:bg-slate-700 mb-4" />
              <div className="h-5 w-3/4 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
              <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, idx) => (
                <NewsSkeletonCard key={idx} />
              ))}
            </div>
          </div>
        ) : (
          <>
            {shownArticles.length ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {shownArticles.map((article, idx) => (
                  <ArticleCard key={`${article.url}-${idx}`} article={article} />
                ))}
              </div>
            ) : (
              <div className="card p-8 text-center">
                <p className="text-sm text-slate-600 dark:text-slate-300">No articles available right now. Try another category or refresh.</p>
              </div>
            )}

            <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-xs text-slate-500 dark:text-slate-400" aria-live="polite">
                Showing {shownArticles.length} of {mergedArticles.length} headlines
                {newsData.generatedAt ? ` • Updated ${new Date(newsData.generatedAt).toLocaleTimeString()}` : ''}
              </p>

              {canLoadMore && (
                <button
                  type="button"
                  onClick={() => {
                    setLoadingMore(true)
                    setLimit((prev) => Math.min(prev + LOAD_MORE_STEP, MAX_LIMIT))
                  }}
                  className="btn-primary text-sm min-w-[170px]"
                >
                  {loadingMore ? <><Loader2 className="w-4 h-4 animate-spin" /> Loading more</> : 'Load More'}
                </button>
              )}
            </div>
          </>
        )}
        </div>
      </div>
    </section>
  )
}
