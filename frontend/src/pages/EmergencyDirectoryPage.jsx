import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Phone } from 'lucide-react'
import { platformService } from '../services/platformService'

export default function EmergencyDirectoryPage() {
  const [states, setStates] = useState([])
  const [selectedState, setSelectedState] = useState('FCT')
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(false)

  const load = async (state) => {
    try {
      setLoading(true)
      const [metaRes, contactsRes] = await Promise.all([
        platformService.getMetadata(),
        platformService.getEmergencyContacts({ state, verifiedOnly: true }),
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
    load(selectedState)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <main className="max-w-5xl mx-auto p-4 sm:p-6 space-y-5">
      <section className="card p-5">
        <h1 className="text-2xl font-bold">Verified Emergency Directory</h1>
        <p className="text-sm text-slate-500 mt-1">Official state-level emergency contacts managed by authorized civic admins.</p>
      </section>

      <section className="card p-5 space-y-4">
        <div>
          <label className="label">Nigerian State</label>
          <select
            className="select"
            value={selectedState}
            onChange={async (e) => {
              const val = e.target.value
              setSelectedState(val)
              await load(val)
            }}
          >
            {states.map((state) => <option key={state} value={state}>{state}</option>)}
          </select>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Loading contacts…</p>
        ) : contacts.length === 0 ? (
          <p className="text-sm text-slate-500">No verified contacts currently listed for {selectedState}.</p>
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
