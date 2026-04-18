import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { AlertTriangle, MapPin, Phone } from 'lucide-react'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { reportService } from '../services/reportService'
import { platformService } from '../services/platformService'
import { enqueueOfflineReport, getOfflineQueue, syncOfflineReports } from '../services/offlineReportQueue'
import Badge from '../components/Badge'

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

const isUsableGoogleMapsKey = (value) => {
  const normalized = String(value || '').trim().toLowerCase()
  if (!normalized) return false

  const placeholderPatterns = [
    'replace',
    'your_',
    'example',
    'placeholder',
    'optional',
    'dummy',
    'test',
  ]

  return !placeholderPatterns.some((pattern) => normalized.includes(pattern))
}

const WEATHER_CODE_LABELS = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  71: 'Slight snow',
  73: 'Moderate snow',
  75: 'Heavy snow',
  80: 'Rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  95: 'Thunderstorm',
}

const initialForm = {
  title: '',
  description: '',
  category: 'other',
  severity: 'medium',
  state: 'FCT',
  incidentDate: new Date().toISOString().slice(0, 16),
  address: '',
  lat: '',
  lng: '',
  isAnonymous: false,
}

export default function CitizenDashboard() {
  const { user, logout } = useAuth()
  const { t } = useLanguage()
  const [meta, setMeta] = useState({ states: [], incidentCategories: [] })
  const [reports, setReports] = useState([])
  const [contacts, setContacts] = useState([])
  const [mapReports, setMapReports] = useState([])
  const [mapSummary, setMapSummary] = useState(null)
  const [form, setForm] = useState({ ...initialForm })
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [now, setNow] = useState(new Date())
  const [weather, setWeather] = useState(null)
  const [weatherLoading, setWeatherLoading] = useState(false)
  const [geoResolving, setGeoResolving] = useState(false)
  const [queuedCount, setQueuedCount] = useState(() => getOfflineQueue().length)
  const [configHealth, setConfigHealth] = useState(null)

  const previewLat = Number(form.lat)
  const previewLng = Number(form.lng)
  const hasPreviewCoordinates = Number.isFinite(previewLat) && Number.isFinite(previewLng)

  const fetchReports = async () => {
    const res = await reportService.getMyReports({ limit: 20 })
    setReports(res.data.reports || [])
  }

  const fetchContacts = async (state) => {
    const res = await platformService.getEmergencyContacts({ state, verifiedOnly: true })
    setContacts(res.data.contacts || [])
  }

  const fetchMapData = async (stateFilter) => {
    const [mapRes, summaryRes] = await Promise.all([
      reportService.getMapReports({ state: stateFilter }),
      reportService.getMapSummary(),
    ])
    setMapReports(mapRes.data.reports || [])
    setMapSummary(summaryRes.data.summary || null)
  }

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true)
        const [metaRes, healthRes] = await Promise.all([
          platformService.getMetadata(),
          platformService.getConfigHealth(),
          fetchReports(),
        ])
        const metadata = metaRes.data.metadata
        setMeta(metadata)
        setConfigHealth(healthRes.data.configHealth || null)

        const fallbackState = user?.state || 'FCT'
        setForm((prev) => ({ ...prev, state: fallbackState }))
        await fetchContacts(fallbackState)
        await fetchMapData(fallbackState)
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!hasPreviewCoordinates) {
      setWeather(null)
      return
    }

    const controller = new AbortController()
    const timeout = setTimeout(async () => {
      try {
        setWeatherLoading(true)
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${previewLat}&longitude=${previewLng}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=auto`
        const response = await fetch(url, { signal: controller.signal })
        if (!response.ok) throw new Error('Weather fetch failed')

        const data = await response.json()
        if (!data?.current) {
          setWeather(null)
          return
        }

        const code = data.current.weather_code
        setWeather({
          temperature: data.current.temperature_2m,
          feelsLike: data.current.apparent_temperature,
          windSpeed: data.current.wind_speed_10m,
          label: WEATHER_CODE_LABELS[code] || 'Unknown weather',
        })
      } catch (err) {
        if (err?.name !== 'AbortError') {
          setWeather(null)
        }
      } finally {
        setWeatherLoading(false)
      }
    }, 500)

    return () => {
      clearTimeout(timeout)
      controller.abort()
    }
  }, [hasPreviewCoordinates, previewLat, previewLng])

  const statusCount = useMemo(() => {
    const map = { pending: 0, under_review: 0, resolved: 0 }
    reports.forEach((r) => {
      if (map[r.status] !== undefined) map[r.status] += 1
    })
    return map
  }, [reports])

  const setField = (k, v) => setForm((p) => ({ ...p, [k]: v }))

  const resolveAddressFromCoordinates = async (lat, lng) => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null

    if (isUsableGoogleMapsKey(GOOGLE_MAPS_API_KEY)) {
      const googleUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`
      const response = await fetch(googleUrl)
      if (!response.ok) throw new Error('Google geocoding failed')
      const data = await response.json()
      const first = data?.results?.[0]
      return first?.formatted_address || null
    }

    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
    const response = await fetch(url)
    if (!response.ok) throw new Error('Reverse geocoding failed')
    const data = await response.json()
    return data?.display_name || null
  }

  const resolveCoordinatesFromAddress = async (address, state) => {
    if (!address?.trim()) return null
    const query = `${address}, ${state || 'Nigeria'}`

    if (isUsableGoogleMapsKey(GOOGLE_MAPS_API_KEY)) {
      const googleUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${GOOGLE_MAPS_API_KEY}`
      const response = await fetch(googleUrl)
      if (!response.ok) throw new Error('Google address geocoding failed')
      const data = await response.json()
      const loc = data?.results?.[0]?.geometry?.location
      if (!loc) return null
      return { lat: loc.lat, lng: loc.lng }
    }

    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`
    const response = await fetch(url)
    if (!response.ok) throw new Error('Address geocoding failed')
    const data = await response.json()
    const first = Array.isArray(data) ? data[0] : null
    if (!first) return null
    return { lat: Number(first.lat), lng: Number(first.lon) }
  }

  const useCurrentLocation = async () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported in this browser')
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = Number(position.coords.latitude)
        const lng = Number(position.coords.longitude)

        setForm((prev) => ({
          ...prev,
          lat: String(lat),
          lng: String(lng),
        }))

        try {
          setGeoResolving(true)
          const address = await resolveAddressFromCoordinates(lat, lng)
          if (address) {
            setField('address', address)
            toast.success('Location captured and address auto-filled')
          } else {
            toast.success('Location captured')
          }
        } catch {
          toast.success('Location captured')
        } finally {
          setGeoResolving(false)
        }
      },
      () => toast.error('Unable to get your current location'),
      { enableHighAccuracy: true, timeout: 12000 }
    )
  }

  const handleAutofillAddress = async () => {
    const lat = Number(form.lat)
    const lng = Number(form.lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      toast.error('Enter valid latitude and longitude first')
      return
    }

    try {
      setGeoResolving(true)
      const address = await resolveAddressFromCoordinates(lat, lng)
      if (!address) {
        toast.error('Could not resolve address for these coordinates')
        return
      }
      setField('address', address)
      toast.success('Address auto-filled from coordinates')
    } catch {
      toast.error('Failed to autofill address')
    } finally {
      setGeoResolving(false)
    }
  }

  const handleFindCoordinates = async () => {
    if (!form.address?.trim()) {
      toast.error('Enter address first')
      return
    }

    try {
      setGeoResolving(true)
      const coords = await resolveCoordinatesFromAddress(form.address, form.state)
      if (!coords) {
        toast.error('Could not find coordinates for this address')
        return
      }
      setForm((prev) => ({
        ...prev,
        lat: String(coords.lat),
        lng: String(coords.lng),
      }))
      toast.success('Coordinates resolved from address')
    } catch {
      toast.error('Failed to resolve coordinates')
    } finally {
      setGeoResolving(false)
    }
  }

  const submitReport = async (e) => {
    e.preventDefault()
    try {
      const incidentDate = new Date(form.incidentDate)
      if (!form.incidentDate || Number.isNaN(incidentDate.getTime())) {
        toast.error('Please select a valid incident date and time')
        return
      }

      setSubmitting(true)
      const payload = new FormData()
      payload.append('title', form.title)
      payload.append('description', form.description)
      payload.append('category', form.category)
      payload.append('severity', form.severity)
      payload.append('state', form.state)
      payload.append('incidentDate', incidentDate.toISOString())
      payload.append('location.address', form.address)
      payload.append('location.coordinates.lat', form.lat || '0')
      payload.append('location.coordinates.lng', form.lng || '0')
      payload.append('isAnonymous', String(form.isAnonymous))
      files.forEach((file) => payload.append('media', file))

      await reportService.createReport(payload)
      toast.success('Incident report submitted successfully')

      setForm((prev) => ({ ...initialForm, state: prev.state }))
      setFiles([])
      await fetchReports()
      await fetchMapData(form.state)
    } catch (err) {
      const networkIssue = !navigator.onLine || !err.response
      if (networkIssue) {
        if (files.length > 0) {
          toast.error('Offline queue currently supports text/location data only. Please resubmit media when online.')
        }

        const queueSize = enqueueOfflineReport({
          title: form.title,
          description: form.description,
          category: form.category,
          severity: form.severity,
          state: form.state,
          incidentDate: new Date(form.incidentDate).toISOString(),
          'location.address': form.address,
          'location.coordinates.lat': form.lat || '0',
          'location.coordinates.lng': form.lng || '0',
          isAnonymous: String(form.isAnonymous),
        })

        setQueuedCount(queueSize)
        toast.success(t('offlineQueued', 'Offline mode: report queued and will auto-sync once connection is restored.'))
      } else {
        toast.error(err.response?.data?.message || 'Failed to submit report')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const syncQueuedReports = async () => {
    const result = await syncOfflineReports({ createReport: reportService.createReport })
    setQueuedCount(result.remaining)

    if (result.synced > 0) {
      toast.success(`Synced ${result.synced} queued report(s)`)
      await fetchReports()
      await fetchMapData(form.state)
    }

    if (result.failed > 0) {
      toast.error(`${result.failed} queued report(s) still pending`)
    }
  }

  useEffect(() => {
    const handleOnline = () => {
      syncQueuedReports().catch(() => {})
    }

    window.addEventListener('online', handleOnline)
    if (navigator.onLine && getOfflineQueue().length > 0) {
      syncQueuedReports().catch(() => {})
    }

    return () => window.removeEventListener('online', handleOnline)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <main className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      <header className="card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-indigo-600/15 via-violet-600/10 to-sky-600/10 border border-indigo-400/30">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-700 via-violet-700 to-sky-700 dark:from-indigo-300 dark:via-violet-300 dark:to-sky-300 bg-clip-text text-transparent">Citizen Safety Dashboard</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Welcome, {user?.name}. Route incidents by state and upload evidence securely.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/emergency" className="btn-secondary">{t('emergencyDirectory', 'Emergency Directory')}</Link>
          <button onClick={logout} className="btn-danger">Logout</button>
        </div>
      </header>

      {configHealth && (
        <section className="card p-4 space-y-2">
          <p className="text-xs uppercase tracking-wide text-slate-500">System Setup Health</p>
          <div className="flex flex-wrap gap-2">
            <Badge status={configHealth?.database?.connected ? 'active' : 'degraded'} label="Database" dot />
            <Badge status={configHealth?.cloudinary?.configured ? 'configured' : 'unconfigured'} label="Cloudinary Upload" dot />
            <Badge status={isUsableGoogleMapsKey(GOOGLE_MAPS_API_KEY) ? 'configured' : 'fallback'} label="Browser Maps Key" dot />
          </div>
        </section>
      )}

      {queuedCount > 0 && (
        <section className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-l-4 border-amber-500">
          <div>
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">{t('queuedReports', 'Queued offline reports')}: {queuedCount}</p>
            <p className="text-xs text-slate-500">Reports are automatically synced when the connection returns.</p>
          </div>
          <button type="button" className="btn-secondary" onClick={syncQueuedReports}>
            {t('syncNow', 'Sync queued reports now')}
          </button>
        </section>
      )}

      {loading ? (
        <div className="card p-6 text-sm text-slate-500">Loading dashboard…</div>
      ) : (
        <>
          <section className="grid sm:grid-cols-3 gap-4">
            <div className="card p-4 border-l-4 border-indigo-500 bg-gradient-to-br from-indigo-500/10 to-transparent">
              <p className="text-sm text-slate-500">Total Reports</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{reports.length}</p>
            </div>
            <div className="card p-4 border-l-4 border-amber-500 bg-gradient-to-br from-amber-500/10 to-transparent">
              <p className="text-sm text-slate-500">Pending</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{statusCount.pending}</p>
            </div>
            <div className="card p-4 border-l-4 border-emerald-500 bg-gradient-to-br from-emerald-500/10 to-transparent">
              <p className="text-sm text-slate-500">Resolved</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{statusCount.resolved}</p>
            </div>
          </section>

          <section className="card p-4 sm:p-5 space-y-4 border border-sky-500/25 bg-gradient-to-br from-sky-500/10 via-transparent to-violet-500/10">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h2 className="text-lg font-semibold">Nigeria Incident Map</h2>
                <p className="text-sm text-slate-500">Geolocated reports across all states + FCT</p>
              </div>
              <Link to="/live/start" className="btn-secondary">Start Live Incident Stream</Link>
            </div>

            <div className="grid sm:grid-cols-3 gap-3 text-sm">
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                <p className="text-slate-500">Total Reports</p>
                <p className="text-xl font-bold">{mapSummary?.totalReports ?? 0}</p>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                <p className="text-slate-500">High-Risk Incidents</p>
                <p className="text-xl font-bold text-red-600">{mapSummary?.highRiskCount ?? 0}</p>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                <p className="text-slate-500">Visible Markers</p>
                <p className="text-xl font-bold">{mapReports.length}</p>
              </div>
            </div>

            <div className="h-[360px] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
              <MapContainer center={[9.082, 8.6753]} zoom={6} className="h-full w-full" scrollWheelZoom>
                <TileLayer
                  attribution='&copy; OpenStreetMap contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {mapReports
                  .filter((report) => Array.isArray(report?.location?.coordinates?.coordinates) && report.location.coordinates.coordinates.length === 2)
                  .map((report) => {
                    const [lng, lat] = report.location.coordinates.coordinates
                    return (
                      <Marker key={report._id} position={[lat, lng]}>
                        <Popup>
                          <div className="space-y-1">
                            <p className="font-semibold text-sm">{report.title}</p>
                            <p className="text-xs capitalize">{report.category?.replaceAll('_', ' ')} • {report.severity}</p>
                            <p className="text-xs">{report.state}</p>
                            <p className="text-xs">Risk score: {report.riskScore ?? 0}</p>
                          </div>
                        </Popup>
                      </Marker>
                    )
                  })}
              </MapContainer>
            </div>
          </section>

          <section className="grid lg:grid-cols-3 gap-6">
            <form onSubmit={submitReport} className="lg:col-span-2 card p-5 space-y-4 border border-violet-500/25 bg-gradient-to-br from-violet-500/10 via-transparent to-indigo-500/10">
              <h2 className="text-lg font-semibold">{t('submitReport', 'Submit Incident Report')}</h2>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Title</label>
                  <input className="input" value={form.title} onChange={(e) => setField('title', e.target.value)} required />
                </div>
                <div>
                  <label className="label">Category</label>
                  <select className="select" value={form.category} onChange={(e) => setField('category', e.target.value)}>
                    {(meta.incidentCategories || []).map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">State</label>
                  <select
                    className="select"
                    value={form.state}
                    onChange={async (e) => {
                      const newState = e.target.value
                      setField('state', newState)
                      await fetchContacts(newState)
                      await fetchMapData(newState)
                    }}
                  >
                    {(meta.states || []).map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Severity</label>
                  <select className="select" value={form.severity} onChange={(e) => setField('severity', e.target.value)}>
                    {(meta.incidentSeverities || ['low', 'medium', 'high', 'critical']).map((severity) => (
                      <option key={severity} value={severity}>{severity}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Incident Date & Time</label>
                  <input
                    className="input"
                    type="datetime-local"
                    value={form.incidentDate}
                    onChange={(e) => setField('incidentDate', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="label">Address / Landmark</label>
                <input className="input" value={form.address} onChange={(e) => setField('address', e.target.value)} required />
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" className="btn-secondary text-xs" onClick={handleFindCoordinates} disabled={geoResolving}>
                    {geoResolving ? 'Resolving…' : 'Find Coordinates from Address'}
                  </button>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Latitude</label>
                  <input className="input" value={form.lat} onChange={(e) => setField('lat', e.target.value)} />
                </div>
                <div>
                  <label className="label">Longitude</label>
                  <input className="input" value={form.lng} onChange={(e) => setField('lng', e.target.value)} />
                </div>
              </div>

              <button type="button" onClick={useCurrentLocation} className="btn-secondary">
                <MapPin className="w-4 h-4" /> Use Current GPS Location
              </button>

              <button type="button" onClick={handleAutofillAddress} className="btn-secondary" disabled={geoResolving}>
                <MapPin className="w-4 h-4" /> {geoResolving ? 'Autofilling Address…' : 'Autofill Address from Coordinates'}
              </button>

              <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3.5 bg-slate-50/70 dark:bg-slate-900/40 space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Preview</p>
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  Current Date & Time:{' '}
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {now.toLocaleString()}
                  </span>
                </p>
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  Incident Date & Time:{' '}
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {form.incidentDate ? new Date(form.incidentDate).toLocaleString() : 'Not selected'}
                  </span>
                </p>
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  Weather:{' '}
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {!hasPreviewCoordinates
                      ? 'Add latitude and longitude to preview weather'
                      : weatherLoading
                        ? 'Fetching weather…'
                        : weather
                          ? `${weather.label} · ${weather.temperature}°C (feels ${weather.feelsLike}°C) · Wind ${weather.windSpeed} km/h`
                          : 'Weather unavailable'}
                  </span>
                </p>
              </div>

              <div>
                <label className="label">Description</label>
                <textarea className="textarea" rows={5} value={form.description} onChange={(e) => setField('description', e.target.value)} required />
              </div>

              <div>
                <label className="label">Evidence Upload (photos/videos)</label>
                <input type="file" multiple accept="image/*,video/*" onChange={(e) => setFiles(Array.from(e.target.files || []))} className="input" />
                <p className="text-xs text-slate-500 mt-1">{files.length} file(s) selected</p>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.isAnonymous} onChange={(e) => setField('isAnonymous', e.target.checked)} />
                Submit anonymously
              </label>

              <button disabled={submitting} type="submit" className="btn-primary w-full">
                <AlertTriangle className="w-4 h-4" /> {submitting ? 'Submitting…' : 'Submit Incident'}
              </button>
            </form>

            <aside className="space-y-4">
              <div className="card p-4">
                <h3 className="font-semibold mb-3">Emergency Contacts — {form.state}</h3>
                {contacts.length === 0 ? (
                  <p className="text-sm text-slate-500">No verified contacts for this state yet.</p>
                ) : (
                  <div className="space-y-2">
                    {contacts.slice(0, 6).map((contact) => (
                      <div key={contact._id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-2.5">
                        <p className="text-sm font-semibold">{contact.agencyName}</p>
                        <p className="text-xs text-slate-500 capitalize">{String(contact.type || contact.authorityType || 'other').replace('_', ' ')}</p>
                        <a className="text-sm text-indigo-600 mt-1 inline-flex items-center gap-1" href={`tel:${contact.phoneNumber}`}>
                          <Phone className="w-3.5 h-3.5" /> {contact.phoneNumber}
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </aside>
          </section>

          <section className="card p-5">
            <h2 className="text-lg font-semibold mb-3">My Submitted Reports</h2>
            <div className="space-y-3">
              {reports.length === 0 ? (
                <p className="text-sm text-slate-500">No reports yet.</p>
              ) : (
                reports.map((report) => (
                  <div key={report._id} className="border border-slate-200 dark:border-slate-700 rounded-xl p-3.5">
                    <div className="flex flex-wrap items-center gap-2 justify-between">
                      <p className="font-semibold">{report.title}</p>
                      <Badge status={report.status} />
                    </div>
                    <p className="text-sm text-slate-500 mt-1">{report.state} · {report.category}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Incident: {report.incidentDate ? new Date(report.incidentDate).toLocaleString() : 'N/A'}
                    </p>
                    {report.moderation?.flagged && (
                      <p className="text-xs text-amber-600 mt-1">Moderation review in progress</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>
        </>
      )}
    </main>
  )
}
