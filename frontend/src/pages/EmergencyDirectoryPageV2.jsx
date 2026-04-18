import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { LocateFixed, Phone } from 'lucide-react'
import { platformService } from '../services/platformService'
import { useLanguage } from '../context/LanguageContext'

export default function EmergencyDirectoryPageV2() {
  const { t } = useLanguage()
  const [states, setStates] = useState([])
  const [selectedState, setSelectedState] = useState('FCT')
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [nearbyLoading, setNearbyLoading] = useState(false)
  const [nearbyContacts, setNearbyContacts] = useState([])
  const [detectedState, setDetectedState] = useState('')

  const loadMetadata = async () => {
    const metaRes = await platformService.getMetadata()
    const availableStates = metaRes.data.metadata?.states || []
    setStates(availableStates)

    if (!availableStates.includes(selectedState) && availableStates.length > 0) {
      setSelectedState(availableStates[0])
    }
  }

  const loadContactsByState = async (state, query = '') => {
    try {
      setLoading(true)
      const contactsRes = await platformService.getEmergencyContactsByState(state, {
        verifiedOnly: true,
        search: query || undefined,
      })
      setContacts(contactsRes.data.contacts || [])
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load emergency directory')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const init = async () => {
      try {
        await loadMetadata()
        await loadContactsByState(selectedState, search)
      } catch {
        toast.error('Failed to initialize emergency directory')
      }
    }

    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const groupedByAuthority = useMemo(() => {
    const map = new Map()

    contacts.forEach((contact) => {
      const key = contact.type || contact.authorityType || 'other'
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(contact)
    })

    return [...map.entries()]
  }, [contacts])

  const suggestions = contacts
    .flatMap((contact) => [contact.name, contact.agencyName, contact.agency, contact.phoneNumber, ...(contact.phoneNumbers || [])])
    .filter(Boolean)
    .slice(0, 20)

  const detectNearby = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported in this browser')
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = Number(position.coords.latitude)
        const lng = Number(position.coords.longitude)

        try {
          setNearbyLoading(true)
          const { data } = await platformService.getNearbyEmergencyContacts({
            lat,
            lng,
            radiusKm: 300,
            verifiedOnly: true,
            limit: 12,
          })

          setNearbyContacts(data.nearby || [])
          setDetectedState(data.detectedState || '')

          if (data.detectedState) {
            setSelectedState(data.detectedState)
            await loadContactsByState(data.detectedState, search)
          }

          toast.success('Nearby emergency authorities detected')
        } catch (err) {
          toast.error(err.response?.data?.message || 'Failed to detect nearby authorities')
        } finally {
          setNearbyLoading(false)
        }
      },
      () => toast.error('Unable to access your current location'),
      { enableHighAccuracy: true, timeout: 12000 }
    )
  }

  return (
    <main className="max-w-6xl mx-auto p-4 sm:p-6 space-y-5">
      <section className="card p-5">
        <h1 className="text-2xl font-bold">{t('quickDialDirectory', 'Verified Emergency Directory')}</h1>
        <p className="text-sm text-slate-500 mt-1">{t('quickDialDescription', 'Official state-level emergency contacts managed by authorized civic admins.')}</p>
      </section>

      <section className="card p-5 space-y-4">
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <p className="text-sm text-slate-600 dark:text-slate-300">Click a state to display all verified emergency numbers.</p>
          <button className="btn-secondary" onClick={detectNearby} disabled={nearbyLoading}>
            <LocateFixed className="w-4 h-4" /> {nearbyLoading ? 'Detecting…' : 'Detect nearby authorities'}
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {states.map((state) => (
            <button
              key={state}
              className={`px-3 py-1.5 rounded-full text-sm border transition ${selectedState === state ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              onClick={async () => {
                setSelectedState(state)
                await loadContactsByState(state, search)
              }}
            >
              {state}
            </button>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Quick Search</label>
            <input
              className="input"
              list="authority-suggestions"
              value={search}
              onChange={async (e) => {
                const value = e.target.value
                setSearch(value)
                await loadContactsByState(selectedState, value)
              }}
              placeholder={t('searchAuthorities', 'Search authorities, agency, or phone')}
            />
            <datalist id="authority-suggestions">
              {suggestions.map((item) => <option key={item} value={item} />)}
            </datalist>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 text-sm">
            <p className="font-semibold">Selected state: {selectedState}</p>
            <p className="text-slate-500 mt-1">{detectedState ? `Nearby detection suggests: ${detectedState}` : 'Use nearby detection for location-based suggestions.'}</p>
          </div>
        </div>

        {nearbyContacts.length > 0 && (
          <div className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-900/20 p-4">
            <h3 className="font-semibold text-indigo-700 dark:text-indigo-300 mb-2">Nearby authorities</h3>
            <div className="grid md:grid-cols-2 gap-2">
              {nearbyContacts.map((contact) => (
                <div key={`near-${contact._id}-${contact.phoneNumber || contact.phonePrimary}`} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                  <p className="font-semibold">{contact.agencyName || contact.agency || contact.name}</p>
                  <p className="text-xs text-slate-500 capitalize">{(contact.type || contact.authorityType || 'other').replace('_', ' ')} · {contact.state} · {contact.distanceKm} km</p>
                  {(contact.phoneNumbers || []).map((phone) => (
                    <a key={phone} className="inline-flex items-center gap-1 text-indigo-600 mt-1 mr-3" href={`tel:${phone}`}>
                      <Phone className="w-4 h-4" /> {phone}
                    </a>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-sm text-slate-500">{t('loadingContacts', 'Loading contacts…')}</p>
        ) : contacts.length === 0 ? (
          <p className="text-sm text-slate-500">{search ? t('noMatch', 'No matching authorities found.') : `${t('noContacts', 'No verified contacts currently listed for this state.')} (${selectedState})`}</p>
        ) : (
          <div className="space-y-4">
            {groupedByAuthority.map(([authorityType, records]) => (
              <div key={authorityType} className="border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                <p className="text-sm font-semibold capitalize mb-3">{String(authorityType).replace('_', ' ')}</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  {records.map((contact) => (
                    <div key={contact._id} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                      <p className="font-semibold">{contact.agencyName || contact.name || contact.agency}</p>
                      {(contact.phoneNumbers || []).map((phone) => (
                        <a key={phone} className="inline-flex items-center gap-1 text-indigo-600 mt-1 mr-3" href={`tel:${phone}`}>
                          <Phone className="w-4 h-4" /> {phone}
                        </a>
                      ))}
                      {contact.address && <p className="text-sm text-slate-600 mt-2">{contact.address}</p>}
                      {contact.email && <p className="text-xs text-slate-500 mt-1">{contact.email}</p>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
