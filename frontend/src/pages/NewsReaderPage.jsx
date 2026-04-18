import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { ArrowLeft, BookOpenText, Bookmark, BookmarkCheck, Globe, MapPin, Trash2 } from 'lucide-react'

const SAVED_NEWS_STORAGE_KEY = 'saved_news_articles_v1'
const READING_PROGRESS_STORAGE_KEY = 'news_reading_progress_v1'
const LAST_READING_ARTICLE_STORAGE_KEY = 'last_reading_article_v1'

const fallbackImage = (region) =>
  region === 'nigeria'
    ? 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200&q=80'
    : 'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=1200&q=80'

const formatTimestamp = (isoString) => {
  if (!isoString) return 'Unknown publish time'
  const parsed = new Date(isoString)
  if (Number.isNaN(parsed.getTime())) return 'Unknown publish time'
  return parsed.toLocaleString()
}

const buildArticleKey = (article) => article?.url || `${article?.title || 'untitled'}-${article?.publishedAt || 'na'}`

const buildReaderQuery = (article) =>
  `?url=${encodeURIComponent(article?.url || '')}&title=${encodeURIComponent(article?.title || '')}&source=${encodeURIComponent(article?.source || '')}&publishedAt=${encodeURIComponent(article?.publishedAt || '')}&region=${encodeURIComponent(article?.region || 'world')}&summary=${encodeURIComponent(article?.summary || '')}&description=${encodeURIComponent(article?.description || '')}&imageUrl=${encodeURIComponent(article?.imageUrl || '')}`

const safeReadJson = (key, fallbackValue) => {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallbackValue
    const parsed = JSON.parse(raw)
    return parsed ?? fallbackValue
  } catch {
    return fallbackValue
  }
}

const safeWriteJson = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore storage failures
  }
}

export default function NewsReaderPage() {
  const location = useLocation()
  const [searchParams] = useSearchParams()

  const stateArticle = location.state?.article || null
  const backTo = location.state?.backTo || '/news/all?state=All'

  const article = stateArticle || {
    title: searchParams.get('title') || 'News Article',
    summary: searchParams.get('summary') || '',
    description: searchParams.get('description') || '',
    source: searchParams.get('source') || 'News Source',
    publishedAt: searchParams.get('publishedAt') || null,
    imageUrl: searchParams.get('imageUrl') || '',
    url: searchParams.get('url') || '',
    region: searchParams.get('region') || 'world',
  }

  const articleKey = useMemo(() => buildArticleKey(article), [article])
  const [savedArticles, setSavedArticles] = useState(() => safeReadJson(SAVED_NEWS_STORAGE_KEY, []))
  const [readingProgress, setReadingProgress] = useState(0)

  const savedLookup = useMemo(() => {
    const map = new Map()
    for (const item of savedArticles) map.set(buildArticleKey(item), true)
    return map
  }, [savedArticles])

  const isSaved = savedLookup.has(articleKey)

  useEffect(() => {
    const progressMap = safeReadJson(READING_PROGRESS_STORAGE_KEY, {})
    const initial = Number(progressMap?.[articleKey] || 0)
    setReadingProgress(Math.max(0, Math.min(100, initial)))

    safeWriteJson(LAST_READING_ARTICLE_STORAGE_KEY, {
      article,
      backTo,
      progress: Math.max(0, Math.min(100, initial)),
      updatedAt: new Date().toISOString(),
    })

    const handleScroll = () => {
      const doc = document.documentElement
      const scrollTop = doc.scrollTop || document.body.scrollTop || 0
      const maxScroll = (doc.scrollHeight || 0) - (doc.clientHeight || 0)
      const percent = maxScroll <= 0 ? 100 : Math.round((scrollTop / maxScroll) * 100)
      const bounded = Math.max(0, Math.min(100, percent))
      setReadingProgress(bounded)

      const nextMap = safeReadJson(READING_PROGRESS_STORAGE_KEY, {})
      nextMap[articleKey] = bounded
      safeWriteJson(READING_PROGRESS_STORAGE_KEY, nextMap)

      safeWriteJson(LAST_READING_ARTICLE_STORAGE_KEY, {
        article,
        backTo,
        progress: bounded,
        updatedAt: new Date().toISOString(),
      })
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [articleKey])

  const handleToggleSave = () => {
    const current = safeReadJson(SAVED_NEWS_STORAGE_KEY, [])
    const key = buildArticleKey(article)
    const exists = current.some((item) => buildArticleKey(item) === key)

    const next = exists
      ? current.filter((item) => buildArticleKey(item) !== key)
      : [
          {
            ...article,
            savedAt: new Date().toISOString(),
          },
          ...current,
        ]

    safeWriteJson(SAVED_NEWS_STORAGE_KEY, next)
    setSavedArticles(next)
  }

  const handleRemoveSaved = (itemKey) => {
    const next = savedArticles.filter((item) => buildArticleKey(item) !== itemKey)
    safeWriteJson(SAVED_NEWS_STORAGE_KEY, next)
    setSavedArticles(next)
  }

  const readText = article.summary || article.description || 'No article summary available.'

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-4">
          <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
            <div
              className="h-full bg-indigo-600 transition-all duration-200"
              style={{ width: `${readingProgress}%` }}
              aria-label={`Reading progress ${readingProgress}%`}
            />
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Reading progress: {readingProgress}%</p>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Link to={backTo} className="btn-secondary text-sm inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to News
          </Link>

          <Link to="/news/all?state=All" className="btn-secondary text-sm">All Categories</Link>

          <button type="button" className="btn-secondary text-sm inline-flex items-center gap-2" onClick={handleToggleSave}>
            {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
            {isSaved ? 'Saved' : 'Save for later'}
          </button>
        </div>

        <article className="card overflow-hidden">
          <img
            src={article.imageUrl || fallbackImage(article.region)}
            alt={article.title || 'News article'}
            className="w-full h-72 sm:h-96 object-cover"
            loading="eager"
          />

          <div className="p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-[11px] uppercase tracking-wider font-extrabold px-2.5 py-1 rounded-full bg-indigo-600 text-white inline-flex items-center gap-1">
                <BookOpenText className="w-3.5 h-3.5" /> Reader View
              </span>

              <span
                className={`text-[11px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${
                  article.region === 'nigeria'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                }`}
              >
                {article.region === 'nigeria' ? (
                  <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" /> Nigeria</span>
                ) : (
                  <span className="inline-flex items-center gap-1"><Globe className="w-3 h-3" /> World</span>
                )}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black leading-tight text-slate-900 dark:text-white">{article.title}</h1>

            <div className="mt-3 text-sm text-slate-500 dark:text-slate-400 font-medium">
              {article.source || 'News Source'} • {formatTimestamp(article.publishedAt)}
            </div>

            <div className="mt-6 prose prose-slate dark:prose-invert max-w-none">
              <p className="text-base leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-line">{readText}</p>
            </div>

            <div className="mt-8">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Clean reading mode enabled for focus.
              </p>
            </div>
          </div>
        </article>

        <section className="mt-8 card p-5">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">Saved for later</h2>

          {savedArticles.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No saved articles yet. Tap “Save for later” on any article.</p>
          ) : (
            <div className="space-y-3">
              {savedArticles.slice(0, 8).map((item) => {
                const itemKey = buildArticleKey(item)
                return (
                  <div key={itemKey} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border border-slate-200 dark:border-slate-700 rounded-xl p-3">
                    <div>
                      <Link
                        to={{ pathname: '/news/read', search: buildReaderQuery(item) }}
                        state={{ article: item, backTo: '/news/all?state=All' }}
                        className="text-sm font-semibold text-slate-800 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400"
                      >
                        {item.title || 'Saved Article'}
                      </Link>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {item.source || 'News Source'} • saved {formatTimestamp(item.savedAt)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveSaved(itemKey)}
                      className="btn-secondary text-xs inline-flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
