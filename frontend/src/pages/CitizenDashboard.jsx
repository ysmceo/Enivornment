import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { AlertTriangle, MapPin } from 'lucide-react'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { authService } from '../services/authService'
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

const FORM_STEPS = [
  { id: 1, title: 'Incident Basics' },
  { id: 2, title: 'Location & Time' },
  { id: 3, title: 'Details & Evidence' },
  { id: 4, title: 'Review & Submit' },
]

export default function CitizenDashboard() {
  const { user, logout, refreshUser } = useAuth()
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
  const [queuedCount, setQueuedCount] = useState(() => getOfflineQueue()?.length || 0)
  const [configHealth, setConfigHealth] = useState(null)
  const [formStep, setFormStep] = useState(1)
  const [verificationIdNumber, setVerificationIdNumber] = useState('')
  const [verificationFile, setVerificationFile] = useState(null)
  const [verificationSelfieFile, setVerificationSelfieFile] = useState(null)
  const [uploadingVerification, setUploadingVerification] = useState(false)
  const syncInProgressRef = useRef(false)

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

  const canStartLiveStream = user?.role === 'user' && user?.idVerificationStatus === 'verified'
  const hasGovernmentIdForVerification = Boolean(user?.hasGovernmentId)
  const hasSelfieForVerification = Boolean(user?.hasVerificationSelfie)
  const verificationProgressPercent =
    (hasGovernmentIdForVerification ? 50 : 0) + (hasSelfieForVerification ? 50 : 0)
  const liveStreamRestriction = useMemo(() => {
    if (canStartLiveStream) return ''
    if (user?.role !== 'user') {
      return 'Live streaming can only be started from a verified citizen user account.'
    }
    return 'Complete ID verification to start live streaming.'
  }, [canStartLiveStream, user?.idVerificationStatus, user?.role])

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

  const validateStep = (step) => {
    if (step === 1) {
      if (!String(form.title || '').trim()) {
        toast.error('Please enter a report title')
        return false
      }
      return true
    }

    if (step === 2) {
      const incidentDate = new Date(form.incidentDate)
      if (!form.incidentDate || Number.isNaN(incidentDate.getTime())) {
        toast.error('Please select a valid incident date and time')
        return false
      }
      if (!String(form.address || '').trim()) {
        toast.error('Please enter an address or landmark')
        return false
      }
      return true
    }

    if (step === 3) {
      if (!String(form.description || '').trim()) {
        toast.error('Please enter a report description')
        return false
      }
      return true
    }

    return true
  }

  const goToNextStep = () => {
    if (!validateStep(formStep)) return
    setFormStep((prev) => Math.min(prev + 1, FORM_STEPS.length))
  }

  const goToPrevStep = () => {
    setFormStep((prev) => Math.max(prev - 1, 1))
  }

  const handleReportFormSubmit = async (e) => {
    e.preventDefault()

    if (formStep < FORM_STEPS.length) {
      goToNextStep()
      return
    }

    if (!validateStep(formStep)) return

    await submitReport()
  }

  const uploadVerificationId = async (e) => {
    e.preventDefault()

    if (!verificationIdNumber.trim()) {
      toast.error('Please enter your ID card number')
      return
    }

    if (!verificationFile) {
      toast.error('Please choose your government ID file')
      return
    }

    try {
      setUploadingVerification(true)
      const response = await authService.uploadGovernmentId(verificationFile, verificationIdNumber.trim())
      await refreshUser()
      setVerificationFile(null)
      setVerificationIdNumber('')
      toast.success(response?.data?.message || 'Government ID uploaded successfully.')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload government ID')
    } finally {
      setUploadingVerification(false)
    }
  }

  const uploadVerificationSelfie = async (e) => {
    e.preventDefault()

    if (!verificationSelfieFile) {
      toast.error('Please choose a selfie file')
      return
    }

    try {
      setUploadingVerification(true)
      const response = await authService.uploadVerificationSelfie(verificationSelfieFile)
      await refreshUser()
      setVerificationSelfieFile(null)
      toast.success(response?.data?.message || 'Verification selfie uploaded successfully.')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload verification selfie')
    } finally {
      setUploadingVerification(false)
    }
  }

  const submitReport = async () => {
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
      setFormStep(1)
      setFiles([])
      await fetchReports()
      await fetchMapData(form.state)
    } catch (err) {
      const networkIssue = !navigator.onLine || !err.response
      if (networkIssue) {
        if (files.length > 0) {
          toast.error(t('offlineMediaResubmit', 'Offline queue currently supports text/location data only. Please resubmit media when online.'))
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
    if (syncInProgressRef.current) return

    try {
      syncInProgressRef.current = true
      const result = await syncOfflineReports({ createReport: reportService.createReport })
      setQueuedCount(result.remaining)

      if (result.synced > 0) {
        toast.success(`Synced ${result.synced} queued report(s)`, { id: 'offline-sync-success' })
        await fetchReports()
        await fetchMapData(form.state)
      }

      if (result.discarded > 0) {
        toast.error(
          `${result.discarded} queued report(s) were removed because the data is no longer valid. Please resubmit them.`,
          { id: 'offline-sync-discarded' }
        )
      }

      if (result.unauthorized > 0) {
        toast.error(
          'Your session expired. Please sign in again to sync remaining queued reports.',
          { id: 'offline-sync-unauthorized' }
        )
      }

      if (result.failed > 0) {
        toast.error(`${result.failed} queued report(s) still pending`, { id: 'offline-sync-pending' })
      } else {
        toast.dismiss('offline-sync-pending')
      }
    } catch {
      toast.error('Failed to sync queued reports. Will retry automatically when online.', { id: 'offline-sync-error' })
    } finally {
      syncInProgressRef.current = false
    }
  }

  useEffect(() => {
    const handleOnline = () => {
      syncQueuedReports().catch(() => {})
    }

    window.addEventListener('online', handleOnline)
    if (navigator.onLine && (getOfflineQueue()?.length || 0) > 0) {
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

      {user?.idVerificationStatus !== 'verified' && (
        <section className="card p-4 space-y-3 border border-amber-300/70 dark:border-amber-700/60 bg-amber-50/60 dark:bg-amber-900/20">
          <h3 className="font-semibold text-amber-800 dark:text-amber-300">Identity verification required</h3>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            You must upload both a valid government ID and a recent selfie, then wait for admin approval before submitting incident reports.
            Current status: <span className="font-semibold capitalize">{user?.idVerificationStatus || 'none'}</span>
            <span className="ml-2 inline-flex items-center rounded-full border border-indigo-300 dark:border-indigo-700 bg-indigo-100 dark:bg-indigo-900/30 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
              {verificationProgressPercent}% complete
            </span>
          </p>

          <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 bg-white/70 dark:bg-slate-900/40">
            <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Verification progress</p>
            <div className="flex flex-wrap gap-2">
              <span className={`text-xs px-2.5 py-1 rounded-full border ${hasGovernmentIdForVerification ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700' : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'}`}>
                {hasGovernmentIdForVerification ? '✅ Government ID uploaded' : '⏳ Government ID pending'}
              </span>
              <span className={`text-xs px-2.5 py-1 rounded-full border ${hasSelfieForVerification ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700' : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'}`}>
                {hasSelfieForVerification ? '✅ Selfie uploaded' : '⏳ Selfie pending'}
              </span>
              <span className={`text-xs px-2.5 py-1 rounded-full border ${user?.idVerificationStatus === 'pending' ? 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-700' : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'}`}>
                {user?.idVerificationStatus === 'pending' ? '🕵️ Admin review in progress' : '⏳ Waiting for both uploads'}
              </span>
            </div>
            {user?.idVerificationStatus === 'rejected' && user?.idRejectionReason && (
              <p className="text-xs text-rose-700 dark:text-rose-300 mt-2">
                Last rejection reason: {user.idRejectionReason}
              </p>
            )}
          </div>

          <form onSubmit={uploadVerificationId} className="grid md:grid-cols-4 gap-3 items-end">
            <div>
              <label className="label">ID card number</label>
              <input
                className="input"
                value={verificationIdNumber}
                onChange={(e) => setVerificationIdNumber(e.target.value)}
                placeholder="Enter your ID number"
              />
            </div>
            <div>
              <label className="label">Government ID file</label>
              <input
                className="input"
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setVerificationFile(e.target.files?.[0] || null)}
              />
            </div>
            <button type="submit" className="btn-primary" disabled={uploadingVerification}>
              {uploadingVerification ? 'Uploading…' : 'Upload Government ID'}
            </button>
          </form>

          <form onSubmit={uploadVerificationSelfie} className="grid md:grid-cols-3 gap-3 items-end">
            <div className="md:col-span-2">
              <label className="label">Verification selfie</label>
              <input
                className="input"
                type="file"
                accept="image/*"
                onChange={(e) => setVerificationSelfieFile(e.target.files?.[0] || null)}
              />
            </div>
            <button type="submit" className="btn-primary" disabled={uploadingVerification}>
              {uploadingVerification ? 'Uploading…' : 'Upload Selfie'}
            </button>
          </form>
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
              <div className="flex flex-wrap items-center gap-2">
                <Link to="/live" className="btn-secondary">View Live Streams</Link>
                {canStartLiveStream ? (
                  <Link to="/live/start" className="btn-secondary">Start Live Incident Stream</Link>
                ) : (
                  <button
                    type="button"
                    className="btn-secondary opacity-60 cursor-not-allowed"
                    disabled
                    title={liveStreamRestriction}
                  >
                    Start Live Incident Stream
                  </button>
                )}
              </div>
            </div>

            {!canStartLiveStream && (
              <p className="text-xs text-amber-700 dark:text-amber-300">{liveStreamRestriction}</p>
            )}

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
            <form onSubmit={handleReportFormSubmit} className="lg:col-span-2 card p-5 space-y-4 border border-violet-500/25 bg-gradient-to-br from-violet-500/10 via-transparent to-indigo-500/10">
              <h2 className="text-lg font-semibold">{t('submitReport', 'Submit Incident Report')}</h2>

              <div className="flex flex-wrap gap-2">
                {FORM_STEPS.map((step) => (
                  <span
                    key={step.id}
                    className={`text-xs px-2.5 py-1 rounded-full border ${
                      formStep === step.id
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : formStep > step.id
                          ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700'
                          : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                    }`}
                  >
                    {step.id}. {step.title}
                  </span>
                ))}
              </div>

              {formStep === 1 && (
                <>
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
                </>
              )}

              {formStep === 2 && (
                <>
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
                </>
              )}

              {formStep === 3 && (
                <>
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
                </>
              )}

              {formStep === 4 && (
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-white/70 dark:bg-slate-900/30 space-y-2 text-sm">
                  <p><span className="font-semibold">Title:</span> {form.title || 'N/A'}</p>
                  <p><span className="font-semibold">Category:</span> {form.category}</p>
                  <p><span className="font-semibold">State:</span> {form.state}</p>
                  <p><span className="font-semibold">Severity:</span> {form.severity}</p>
                  <p><span className="font-semibold">Incident Date:</span> {form.incidentDate ? new Date(form.incidentDate).toLocaleString() : 'N/A'}</p>
                  <p><span className="font-semibold">Address:</span> {form.address || 'N/A'}</p>
                  <p><span className="font-semibold">Coordinates:</span> {form.lat || '0'}, {form.lng || '0'}</p>
                  <p><span className="font-semibold">Description:</span> {form.description || 'N/A'}</p>
                  <p><span className="font-semibold">Files selected:</span> {files.length}</p>
                  <p><span className="font-semibold">Anonymous:</span> {form.isAnonymous ? 'Yes' : 'No'}</p>
                </div>
              )}

              <div className="flex items-center justify-between gap-2 pt-2">
                <button type="button" onClick={goToPrevStep} className="btn-secondary" disabled={formStep === 1 || submitting}>
                  Prev
                </button>

                {formStep < FORM_STEPS.length ? (
                  <button type="button" onClick={goToNextStep} className="btn-primary" disabled={submitting}>
                    Next
                  </button>
                ) : (
                  <button disabled={submitting} type="submit" className="btn-primary">
                    <AlertTriangle className="w-4 h-4" /> {submitting ? 'Submitting…' : 'Submit Incident'}
                  </button>
                )}
              </div>
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
                        <p className="text-xs text-slate-500 mt-1">Contact numbers are visible to admins only.</p>
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
