import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { LocateFixed, Phone } from 'lucide-react'
import { platformService } from '../services/platformService'
import { useLanguage } from '../context/LanguageContext'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../hooks/useSocket'

export default function EmergencyDirectoryPageV2() {
  const { t } = useLanguage()
  const { isAdmin } = useAuth()
  const { on } = useSocket()
  const [states, setStates] = useState([])
  const [regions, setRegions] = useState([])
  const [authorityTypes, setAuthorityTypes] = useState([])
  const [selectedState, setSelectedState] = useState('all')
  const [selectedRegion, setSelectedRegion] = useState('all')
  const [selectedAuthorityType, setSelectedAuthorityType] = useState('all')
  const [contacts, setContacts] = useState([])
  const [groupedByState, setGroupedByState] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [detectedState, setDetectedState] = useState('')
  const [detectingLocation, setDetectingLocation] = useState(false)

  const load = useCallback(async ({ state, region, authorityType, query, userState } = {}) => {
    try {
      setLoading(true)
      const contactsRes = await platformService.getEmergencyContacts({
        state: state || undefined,
        region: region || undefined,
        authorityType: authorityType || undefined,
        verifiedOnly: true,
        search: query || undefined,
        userState: userState || undefined,
      })

      const payload = contactsRes.data || {}
      setStates(payload.states || [])
      setRegions(payload.regions || [])
      setAuthorityTypes(payload.authorityTypes || [])
      setContacts(payload.contacts || [])
      setGroupedByState(payload.groupedByState || [])
      setSuggestions(payload.suggestions || [])
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load emergency directory')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load({
      state: selectedState !== 'all' ? selectedState : undefined,
      region: selectedRegion !== 'all' ? selectedRegion : undefined,
      authorityType: selectedAuthorityType !== 'all' ? selectedAuthorityType : undefined,
      query: search,
      userState: detectedState || undefined,
    })
  }, [selectedState, selectedRegion, selectedAuthorityType, search, detectedState, load])

  useEffect(() => {
    const unsubscribe = on('emergency-directory:updated', () => {
      load({
        state: selectedState !== 'all' ? selectedState : undefined,
        region: selectedRegion !== 'all' ? selectedRegion : undefined,
        authorityType: selectedAuthorityType !== 'all' ? selectedAuthorityType : undefined,
        query: search,
        userState: detectedState || undefined,
      }).catch(() => {})
    })

    return unsubscribe
  }, [on, load, selectedState, selectedRegion, selectedAuthorityType, search, detectedState])

  const detectStateFromGPS = async () => {
    if (!navigator?.geolocation) {
      toast.error('Geolocation is not supported in this browser')
      return
    }

    setDetectingLocation(true)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const lat = position.coords.latitude
          const lng = position.coords.longitude
          const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
          const response = await fetch(url)
          if (!response.ok) throw new Error('Could not resolve your state')
          const data = await response.json()
          const mappedState = data?.address?.state || data?.address?.state_district || ''

          if (!mappedState) {
            toast.error('Unable to detect your state from GPS')
            return
          }

          const foundState = states.find((state) => mappedState.toLowerCase().includes(state.toLowerCase())) || ''
          if (!foundState) {
            toast.error('Detected location is outside configured Nigerian states')
            return
          }

          setDetectedState(foundState)
          toast.success(`${t('gpsDetectedState', 'Detected state')}: ${foundState}`)
        } catch {
          toast.error('Failed to detect location')
        } finally {
          setDetectingLocation(false)
        }
      },
      () => {
        setDetectingLocation(false)
        toast.error('Unable to access GPS location')
      },
      { enableHighAccuracy: true, timeout: 12000 }
    )
  }

  const authorityLabel = useCallback((value) => {
    if (!value) return 'Other'
    return String(value).replaceAll('_', ' ').replace(/\b\w/g, (m) => m.toUpperCase())
  }, [])

  const suggestionsList = useMemo(() => suggestions.slice(0, 20), [suggestions])

  const stateBlocks = groupedByState.length
    ? groupedByState
    : contacts.reduce((acc, contact) => {
      const existing = acc.find((item) => item.state === contact.state)
      if (existing) existing.contacts.push(contact)
      else acc.push({ state: contact.state, region: contact.region, contacts: [contact] })
      return acc
    }, [])

  return (
    <main className="max-w-5xl mx-auto p-4 sm:p-6 space-y-5">
      <section className="card p-5">
        <h1 className="text-2xl font-bold">{t('quickDialDirectory', 'Verified Emergency Directory')}</h1>
        <p className="text-sm text-slate-500 mt-1">{t('quickDialDescription', 'Official state-level emergency contacts managed by authorized civic administrators.')}</p>
      </section>

      <section className="card p-5 space-y-4">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="label">{t('regionLabel', 'Nigerian State / Region')}</label>
            <select className="select" value={selectedState} onChange={(e) => setSelectedState(e.target.value)}>
              <option value="all">{t('allStates', 'All states')}</option>
              {states.map((state) => <option key={state} value={state}>{state}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Region</label>
            <select className="select" value={selectedRegion} onChange={(e) => setSelectedRegion(e.target.value)}>
              <option value="all">{t('allRegions', 'All regions')}</option>
              {regions.map((region) => <option key={region} value={region}>{region}</option>)}
            </select>
          </div>
          <div>
            <label className="label">{t('authorityTypeLabel', 'Authority type')}</label>
            <select className="select" value={selectedAuthorityType} onChange={(e) => setSelectedAuthorityType(e.target.value)}>
              <option value="all">{t('allAuthorities', 'All authorities')}</option>
              {authorityTypes.map((type) => <option key={type} value={type}>{authorityLabel(type)}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Search</label>
            <input className="input" list="authority-suggestions" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('searchAuthorities', 'Search authorities, agency, or phone')} />
            <datalist id="authority-suggestions">
              {suggestionsList.map((item) => <option key={item} value={item} />)}
            </datalist>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <button type="button" className="btn-secondary" onClick={detectStateFromGPS} disabled={detectingLocation}>
            <LocateFixed className="w-4 h-4" />
            {detectingLocation ? 'Detecting…' : t('detectMyLocation', 'Detect my location')}
          </button>

          {detectedState && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">
              {t('gpsDetectedState', 'Detected state')}: <span className="font-semibold">{detectedState}</span>
            </p>
          )}
        </div>

        <p className="text-xs text-slate-500">
          {isAdmin
            ? t('quickDialHint', 'Auto-suggest is enabled. Select any number for one-click calling.')
            : 'Authority phone numbers are restricted to admin accounts.'}
        </p>
        {detectedState && <p className="text-xs text-slate-500">{t('nearbyFirst', 'Nearby authorities are prioritized first')}</p>}

        {loading ? (
          <p className="text-sm text-slate-500">{t('loadingContacts', 'Loading contacts…')}</p>
        ) : stateBlocks.length === 0 ? (
          <p className="text-sm text-slate-500">{search ? t('noMatch', 'No matching authorities found.') : `${t('noContacts', 'No verified contacts currently listed for this state.')} (${selectedState})`}</p>
        ) : (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold">{t('stateSectionTitle', 'Emergency Authorities by State')}</h2>
            {stateBlocks.map((stateBlock) => (
              <section key={stateBlock.state} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <h3 className="text-base font-semibold">{stateBlock.state}</h3>
                  <p className="text-xs text-slate-500">{stateBlock.region}</p>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {stateBlock.contacts.map((contact) => (
                    <div key={contact._id} className="border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                      <p className="font-semibold">{contact.name || contact.agency}</p>
                      <p className="text-xs text-slate-500 mt-0.5 capitalize">{authorityLabel(contact.authorityType || 'other')}</p>
                      {isAdmin ? (
                        (contact.phoneNumbers || []).length > 0 ? (
                          <div className="mt-2 space-y-1">
                            {contact.phoneNumbers.map((phone) => (
                              <a key={`${contact._id}-${phone}`} className="inline-flex items-center gap-1 text-indigo-600" href={`tel:${phone}`}>
                                <Phone className="w-4 h-4" /> {phone}
                              </a>
                            ))}
                          </div>
                        ) : (
                          <a className="inline-flex items-center gap-1 text-indigo-600 mt-2" href={`tel:${contact.phonePrimary || contact.phoneNumber}`}>
                            <Phone className="w-4 h-4" /> {contact.phonePrimary || contact.phoneNumber}
                          </a>
                        )
                      ) : (
                        <p className="text-xs text-slate-500 mt-2">Contact numbers are visible to admins only.</p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
