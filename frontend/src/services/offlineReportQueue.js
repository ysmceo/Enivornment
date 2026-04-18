const OFFLINE_QUEUE_KEY = 'cr_offline_reports_v1'

const safeParse = (value, fallback) => {
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

export const getOfflineQueue = () => {
  const parsed = safeParse(localStorage.getItem(OFFLINE_QUEUE_KEY), [])
  return Array.isArray(parsed) ? parsed : []
}

export const saveOfflineQueue = (queue) => {
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue))
}

export const enqueueOfflineReport = (reportPayload) => {
  const queue = getOfflineQueue()
  const next = [
    ...queue,
    {
      id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
      createdAt: new Date().toISOString(),
      payload: reportPayload,
    },
  ]
  saveOfflineQueue(next)
  return next.length
}

const formDataFromPayload = (payload) => {
  const fd = new FormData()
  Object.entries(payload).forEach(([key, value]) => {
    fd.append(key, String(value ?? ''))
  })
  return fd
}

export const syncOfflineReports = async ({ createReport }) => {
  const queue = getOfflineQueue()
  if (!queue.length) return { synced: 0, failed: 0, remaining: 0 }

  const remaining = []
  let synced = 0

  for (const item of queue) {
    try {
      await createReport(formDataFromPayload(item.payload))
      synced += 1
    } catch {
      remaining.push(item)
    }
  }

  saveOfflineQueue(remaining)
  return {
    synced,
    failed: remaining.length,
    remaining: remaining.length,
  }
}
