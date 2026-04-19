import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ChevronDown, ChevronRight, Globe, MapPin, Newspaper, RefreshCw } from 'lucide-react'
import EmptyState from '../components/EmptyState'
import LoadingSpinner from '../components/LoadingSpinner'
import { newsService } from '../services/newsService'

const formatCategory = (value = 'all') => {
  if (!value || value === 'all') return 'All Categories'
  return value[0].toUpperCase() + value.slice(1)
}

const NEWS_POLL_INTERVAL_MS = 60000
const INITIAL_LIMIT = 12
const LOAD_MORE_STEP = 8
const MAX_LIMIT = 60

export default function NewsCategoryPage() {
  const navigate = useNavigate()
  const { category = 'all' } = useParams()
  const [searchParams] = useSearchParams()

  const normalizedCategory = useMemo(() => String(category || 'all').toLowerCase(), [category])
  const stateFilter = searchParams.get('state') || 'All'

  const [newsLoading, setNewsLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [newsError, setNewsError] = useState('')
  const [refreshTick, setRefreshTick] = useState(0)
  const [openSection, setOpenSection] = useState('nigeria')
  const [requestedLimit, setRequestedLimit] = useState(INITIAL_LIMIT)
  const previousLimitRef = useRef(INITIAL_LIMIT)
  const [newsData, setNewsData] = useState({
    nigeria: [],
    world: [],
    categories: ['all'],
    states: ['All'],
    sourceMode: 'live',
    generatedAt: null,
    requestMeta: null,
  })

  useEffect(() => {
    setRequestedLimit(INITIAL_LIMIT)
    previousLimitRef.current = INITIAL_LIMIT
  }, [normalizedCategory, stateFilter])

  useEffect(() => {
    let cancelled = false
    const isLoadMoreRequest = requestedLimit > previousLimitRef.current

    const loadNews = async ({ showLoader = true } = {}) => {
      try {
        if (!cancelled && showLoader) setNewsLoading(true)
        if (!cancelled) setNewsError('')

        const res = await newsService.getCategoryNews({
          category: normalizedCategory,
          state: stateFilter,
          limit: requestedLimit,
        })

        if (!cancelled) {
          setNewsData(res.data.news)
        }
      } catch (err) {
        if (!cancelled) {
          setNewsError(err.response?.data?.message || 'Unable to load category news right now.')
        }
      } finally {
        if (!cancelled) {
          setNewsLoading(false)
          setLoadingMore(false)
        }
      }
    }

    const timeoutId = setTimeout(() => {
      loadNews({ showLoader: !isLoadMoreRequest })
    }, 220)
    const refreshId = setInterval(() => loadNews({ showLoader: false }), NEWS_POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      clearTimeout(timeoutId)
      previousLimitRef.current = requestedLimit
      clearInterval(refreshId)
    }
  }, [normalizedCategory, stateFilter, requestedLimit, refreshTick])

  useEffect(() => {
    const nigeriaCount = (newsData.nigeria || []).length
    const worldCount = (newsData.world || []).length

    if (openSection === 'nigeria' && nigeriaCount === 0 && worldCount > 0) {
      setOpenSection('world')
    }

    if (openSection === 'world' && worldCount === 0 && nigeriaCount > 0) {
      setOpenSection('nigeria')
    }
  }, [newsData.nigeria, newsData.world, openSection])

  const handleCategoryClick = (nextCategory) => {
    if (nextCategory === normalizedCategory) return
    const encodedCategory = encodeURIComponent(nextCategory)
    const encodedState = encodeURIComponent(stateFilter)
    navigate(`/news/${encodedCategory}?state=${encodedState}`)
  }

  const handleStateChange = (nextState) => {
    const encodedCategory = encodeURIComponent(normalizedCategory)
    const encodedState = encodeURIComponent(nextState)
    navigate(`/news/${encodedCategory}?state=${encodedState}`)
  }

  const handleLoadMore = () => {
    setLoadingMore(true)
    setRequestedLimit((prev) => Math.min(prev + LOAD_MORE_STEP, MAX_LIMIT))
  }

  const hasAnyNews = (newsData.nigeria?.length || 0) + (newsData.world?.length || 0) > 0
  const canLoadMore = requestedLimit < MAX_LIMIT && (
    (newsData.nigeria?.length || 0) >= requestedLimit ||
    (newsData.world?.length || 0) >= requestedLimit
  )

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50">
      <section className="border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/70 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col gap-4">
            <Link to="/#news" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
              ← Back to Landing News
            </Link>

            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-semibold mb-3">
                  <Newspaper className="w-3.5 h-3.5" /> Live Category Feed
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">
                  {formatCategory(normalizedCategory)} News — World + Nigeria
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                  Expanded category coverage with live updates every minute.
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold">
                  <span className="inline-flex items-center rounded-full px-2.5 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                    Daily fresh headlines • auto-refresh 1 min
                  </span>
                  <span className="inline-flex items-center rounded-full px-2.5 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                    Coverage: BBC, CNN, global + Nigeria
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">
                  Last successful refresh:{' '}
                  {newsData.generatedAt ? new Date(newsData.generatedAt).toLocaleTimeString() : 'Waiting for first sync...'}
                </p>
                {newsData.sourceMode === 'fallback' && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 font-semibold">
                    Using fallback sample news (set NEWS_API_KEY in backend/.env for live feeds).
                  </p>
                )}
                {newsData.sourceMode === 'hybrid' && (
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-2 font-semibold">
                    Live mode with RSS backfill for missing regions.
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

              <button
                type="button"
                onClick={() => setRefreshTick((prev) => prev + 1)}
                className="btn-secondary text-sm inline-flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> Refresh now
              </button>
            </div>

            <div>
              <Link to="/news/all?state=All" className="btn-secondary text-sm inline-flex items-center gap-2">
                View All Categories
              </Link>
            </div>

            <div className="flex flex-wrap gap-2">
              {(newsData.categories || ['all']).map((item) => {
                const isActive = item === normalizedCategory
                return (
                  <button
                    type="button"
                    key={item}
                    onClick={() => handleCategoryClick(item)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {formatCategory(item)}
                  </button>
                )
              })}

              <select
                className="select text-sm ml-auto"
                value={stateFilter}
                onChange={(e) => handleStateChange(e.target.value)}
              >
                {(newsData.states || ['All']).map((state) => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {newsError && (
          <div className="mb-6 rounded-xl border border-red-300/60 dark:border-red-800/60 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300 flex items-center justify-between gap-3">
            <span>{newsError}</span>
            <button type="button" className="btn-secondary text-xs" onClick={() => setRefreshTick((prev) => prev + 1)}>Retry</button>
          </div>
        )}

        {newsLoading ? (
          <div className="min-h-[40vh] flex items-center justify-center">
            <LoadingSpinner size="lg" label="Loading category news…" />
          </div>
        ) : !hasAnyNews ? (
          <EmptyState
            title="No news found for this category"
            description="Try another category or switch the Nigeria state filter."
          />
        ) : (
          <div className="space-y-4">
            <section className="card p-3 sm:p-3.5">
              <button
                type="button"
                onClick={() => setOpenSection('nigeria')}
                className={`w-full flex items-center justify-between gap-3 text-left px-1.5 py-2 rounded-md transition-colors duration-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 ${
                  openSection === 'nigeria' ? 'border-b border-slate-200/80 dark:border-slate-700/80' : ''
                }`}
                aria-expanded={openSection === 'nigeria'}
              >
                <span className="inline-flex items-center gap-2 text-sm sm:text-[15px] font-bold text-slate-900 dark:text-white">
                  <MapPin className="w-4 h-4 text-emerald-500" /> Nigeria News
                </span>
                <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {(newsData.nigeria || []).length} articles
                  {openSection === 'nigeria' ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </span>
              </button>

              <div
                className={`grid grid-cols-1 md:grid-cols-2 gap-4 transition-all duration-300 ease-out overflow-hidden ${
                  openSection === 'nigeria' ? 'mt-3 opacity-100 max-h-[2200px]' : 'mt-0 opacity-0 max-h-0 pointer-events-none'
                }`}
              >
                  {(newsData.nigeria || []).length ? (
                    (newsData.nigeria || []).map((article, idx) => (
                      <Link
                        key={`ng-more-${idx}-${article.url}`}
                        to={{
                          pathname: '/news/read',
                          search: `?url=${encodeURIComponent(article.url || '')}&title=${encodeURIComponent(article.title || '')}&source=${encodeURIComponent(article.source || '')}&publishedAt=${encodeURIComponent(article.publishedAt || '')}&region=nigeria`,
                        }}
                        state={{ article: { ...article, region: 'nigeria' }, backTo: `/news/${encodeURIComponent(normalizedCategory)}?state=${encodeURIComponent(stateFilter)}` }}
                        className="card-hover p-4 block"
                      >
                        <img
                          src={article.imageUrl || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=80'}
                          alt={article.title}
                          className="w-full h-40 object-cover rounded-lg mb-3"
                          loading="lazy"
                        />
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mb-1">{article.source || 'Nigeria Source'}</p>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2">{article.title}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-3">{article.summary}</p>
                      </Link>
                    ))
                  ) : (
                    <div className="md:col-span-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 p-4 text-sm text-slate-500 dark:text-slate-400">
                      No Nigeria headlines available for this filter right now.
                    </div>
                  )}
              </div>
            </section>

            <section className="card p-3 sm:p-3.5">
              <button
                type="button"
                onClick={() => setOpenSection('world')}
                className={`w-full flex items-center justify-between gap-3 text-left px-1.5 py-2 rounded-md transition-colors duration-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 ${
                  openSection === 'world' ? 'border-b border-slate-200/80 dark:border-slate-700/80' : ''
                }`}
                aria-expanded={openSection === 'world'}
              >
                <span className="inline-flex items-center gap-2 text-sm sm:text-[15px] font-bold text-slate-900 dark:text-white">
                  <Globe className="w-4 h-4 text-blue-500" /> World News
                </span>
                <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {(newsData.world || []).length} articles
                  {openSection === 'world' ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </span>
              </button>

              <div
                className={`grid grid-cols-1 md:grid-cols-2 gap-4 transition-all duration-300 ease-out overflow-hidden ${
                  openSection === 'world' ? 'mt-3 opacity-100 max-h-[2200px]' : 'mt-0 opacity-0 max-h-0 pointer-events-none'
                }`}
              >
                  {(newsData.world || []).length ? (
                    (newsData.world || []).map((article, idx) => (
                      <Link
                        key={`world-more-${idx}-${article.url}`}
                        to={{
                          pathname: '/news/read',
                          search: `?url=${encodeURIComponent(article.url || '')}&title=${encodeURIComponent(article.title || '')}&source=${encodeURIComponent(article.source || '')}&publishedAt=${encodeURIComponent(article.publishedAt || '')}&region=world`,
                        }}
                        state={{ article: { ...article, region: 'world' }, backTo: `/news/${encodeURIComponent(normalizedCategory)}?state=${encodeURIComponent(stateFilter)}` }}
                        className="card-hover p-4 block"
                      >
                        <img
                          src={article.imageUrl || 'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=800&q=80'}
                          alt={article.title}
                          className="w-full h-40 object-cover rounded-lg mb-3"
                          loading="lazy"
                        />
                        <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold mb-1">{article.source || 'World Source'}</p>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2">{article.title}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-3">{article.summary}</p>
                      </Link>
                    ))
                  ) : (
                    <div className="md:col-span-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 p-4 text-sm text-slate-500 dark:text-slate-400">
                      No world headlines available for this filter right now.
                    </div>
                  )}
              </div>
            </section>
          </div>
        )}

        {!newsLoading && !!newsData.generatedAt && (
          <p className="text-xs text-slate-400 mt-6">Last updated: {new Date(newsData.generatedAt).toLocaleString()}</p>
        )}

        {!newsLoading && hasAnyNews && (
          <div className="mt-6 flex items-center justify-center">
            {canLoadMore ? (
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="btn-primary text-sm min-w-[160px]"
              >
                {loadingMore ? 'Loading more…' : 'Load more news'}
              </button>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">You’re all caught up for this category.</p>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
