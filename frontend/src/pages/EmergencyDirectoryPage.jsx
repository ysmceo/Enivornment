import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Phone } from 'lucide-react'
import { platformService } from '../services/platformService'
import { useLanguage } from '../context/LanguageContext'

export default function EmergencyDirectoryPage() {
  const { t } = useLanguage()
  const [states, setStates] = useState([])
  const [selectedState, setSelectedState] = useState('FCT')
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')

  const load = async (state, query = '') => {
    try {
      setLoading(true)
      const [metaRes, contactsRes] = await Promise.all([
        platformService.getMetadata(),
        platformService.getEmergencyContacts({ state, verifiedOnly: true, search: query || undefined }),
      ])
      setStates(metaRes.data.metadata?.states || [])
      setContacts(contactsRes.data.contacts || [])
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load emergency directory')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(selectedState, search)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const suggestions = contacts
    .flatMap((contact) => [contact.name, contact.agencyName, contact.agency, contact.phoneNumber])
    .filter(Boolean)
    .slice(0, 12)

  return (
    <main className="max-w-5xl mx-auto p-4 sm:p-6 space-y-5">
      <section className="card p-5">
        <h1 className="text-2xl font-bold">{t('quickDialDirectory', 'Verified Emergency Directory')}</h1>
        <p className="text-sm text-slate-500 mt-1">{t('quickDialDescription', 'Official state-level emergency contacts managed by authorized civic admins.')}</p>
      </section>

      <section className="card p-5 space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label">{t('regionLabel', 'Nigerian State / Region')}</label>
            <select
              className="select"
              value={selectedState}
              onChange={async (e) => {
                const val = e.target.value
                setSelectedState(val)
                await load(val, search)
              }}
            >
              {states.map((state) => <option key={state} value={state}>{state}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Quick Search</label>
            <input
              className="input"
              list="authority-suggestions"
              value={search}
              onChange={async (e) => {
                const value = e.target.value
                setSearch(value)
                await load(selectedState, value)
              }}
              placeholder={t('searchAuthorities', 'Search authorities, agency, or phone')}
            />
            <datalist id="authority-suggestions">
              {suggestions.map((item) => <option key={item} value={item} />)}
            </datalist>
          </div>
        </div>

        <p className="text-xs text-slate-500">{t('quickDialHint', 'Auto-suggest is enabled. Tap any number for one-click calling.')}</p>

        {loading ? (
          <p className="text-sm text-slate-500">{t('loadingContacts', 'Loading contacts…')}</p>
        ) : contacts.length === 0 ? (
          <p className="text-sm text-slate-500">{search ? t('noMatch', 'No matching authorities found.') : `${t('noContacts', 'No verified contacts currently listed for this state.')} (${selectedState})`}</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {contacts.map((contact) => (
              <div key={contact._id} className="border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                <p className="font-semibold">{contact.name || contact.agencyName}</p>
                <p className="text-xs text-slate-500 mt-0.5 capitalize">{(contact.agencyType || contact.type || 'other').replace('_', ' ')}</p>
                {Array.isArray(contact.phoneNumbers) && contact.phoneNumbers.length > 0 ? (
                  <div className="mt-2 space-y-1">
                    {contact.phoneNumbers.map((phone) => (
                      <a key={phone} className="inline-flex items-center gap-1 text-indigo-600" href={`tel:${phone}`}>
                        <Phone className="w-4 h-4" /> {phone}
                      </a>
                    ))}
                  </div>
                ) : (
                  <a className="inline-flex items-center gap-1 text-indigo-600 mt-2" href={`tel:${contact.phoneNumber}`}>
                    <Phone className="w-4 h-4" /> {contact.phoneNumber}
                  </a>
                )}
                {contact.address && <p className="text-sm text-slate-600 mt-1">{contact.address}</p>}
                {contact.email && <p className="text-xs text-slate-500 mt-1">{contact.email}</p>}
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
