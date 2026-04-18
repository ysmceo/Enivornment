import api from './api'

const RESPONSE_CACHE_TTL_MS = 20 * 1000
const THROTTLE_WINDOW_MS = 800

const responseCache = new Map()
const inFlightRequests = new Map()
const lastRequestAt = new Map()

const toKey = (params = {}) => JSON.stringify(Object.keys(params).sort().reduce((acc, key) => {
  acc[key] = params[key]
  return acc
}, {}))

const asCachedResponse = (cached) => ({ data: cached.data, __fromCache: true })

const cachedGet = async (params = {}, { force = false } = {}) => {
  const key = toKey(params)
  const now = Date.now()
  const cached = responseCache.get(key)

  if (!force && cached && cached.expiresAt > now) return asCachedResponse(cached)
  if (inFlightRequests.has(key)) return inFlightRequests.get(key)

  const lastAt = lastRequestAt.get(key) || 0
  if (!force && cached && now - lastAt < THROTTLE_WINDOW_MS) {
    return asCachedResponse(cached)
  }

  lastRequestAt.set(key, now)

  const request = api
    .get('/meta/news', { params })
    .then((res) => {
      responseCache.set(key, {
        data: res.data,
        expiresAt: Date.now() + RESPONSE_CACHE_TTL_MS,
      })
      return res
    })
    .catch((err) => {
      if (cached) return asCachedResponse(cached)
      throw err
    })
    .finally(() => {
      inFlightRequests.delete(key)
    })

  inFlightRequests.set(key, request)
  return request
}

export const newsService = {
  getNews: (params = {}, options = {}) => cachedGet(params, options),
  getCategoryNews: ({ category = 'all', state = 'All', limit = 20, page = 1 } = {}) =>
    cachedGet({
      ngCategory: category,
      ngState: state,
      limit,
      page,
    }),
}
