import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Download, Pencil, Plus, RefreshCcw, Search, Trash2, Upload } from 'lucide-react'
import AdminSidebar from '../components/AdminSidebar'
import ThemeToggle from '../components/ThemeToggle'
import Modal from '../components/Modal'
import Alert from '../components/Alert'
import { platformService } from '../services/platformService'
import { useSocket } from '../hooks/useSocket'

const LIMIT = 50

const INITIAL_FORM = {
  name: '',
  agency: '',
  state: '',
  region: '',
  authorityType: 'police',
  category: 'public_safety',
  phonePrimary: '',
  phoneSecondary: '',
  phoneNumbers: '',
  email: '',
  address: '',
  active: true,
  isVerifiedOfficial: true,
}

export default function AdminEmergencyContacts() {
  const importFileRef = useRef(null)
  const { on } = useSocket()
  const [contacts, setContacts] = useState([])
  const [states, setStates] = useState([])
  const [regions, setRegions] = useState([])
  const [authorityTypes, setAuthorityTypes] = useState(['police', 'civil_defence', 'military', 'other'])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [stateFilter, setStateFilter] = useState('all')
  const [regionFilter, setRegionFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [activeFilter, setActiveFilter] = useState('all')
  const [verifiedFilter, setVerifiedFilter] = useState('all')

  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ page: 1, limit: LIMIT, total: 0, pages: 1 })

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(INITIAL_FORM)

  const authorityLabel = useCallback((value) => {
    if (!value) return 'Other'
    return String(value).replaceAll('_', ' ').replace(/\b\w/g, (m) => m.toUpperCase())
  }, [])

  const hydrateForm = useCallback((contact) => {
    if (!contact) {
      setForm(INITIAL_FORM)
      return
    }

    const numbers = Array.isArray(contact.phoneNumbers)
      ? contact.phoneNumbers.filter(Boolean)
      : [contact.phonePrimary, contact.phoneSecondary].filter(Boolean)

    setForm({
      name: contact.name || '',
      agency: contact.agency || '',
      state: contact.state || '',
      region: contact.region || '',
      authorityType: contact.authorityType || 'police',
      category: contact.category || 'public_safety',
      phonePrimary: contact.phonePrimary || numbers[0] || '',
      phoneSecondary: contact.phoneSecondary || numbers[1] || '',
      phoneNumbers: numbers.join(', '),
      email: contact.email || '',
      address: contact.address || '',
      active: contact.active !== false,
      isVerifiedOfficial: contact.isVerifiedOfficial !== false,
    })
  }, [])

  const buildParams = useCallback(() => ({
    page,
    limit: LIMIT,
    search: search || undefined,
    state: stateFilter !== 'all' ? stateFilter : undefined,
    region: regionFilter !== 'all' ? regionFilter : undefined,
    authorityType: typeFilter !== 'all' ? typeFilter : undefined,
    active: activeFilter !== 'all' ? activeFilter : undefined,
    verifiedOnly: verifiedFilter !== 'all' ? verifiedFilter : undefined,
  }), [page, search, stateFilter, regionFilter, typeFilter, activeFilter, verifiedFilter])

  const loadMetadata = useCallback(async () => {
    const { data } = await platformService.getMetadata()
    const metadata = data?.metadata || {}
    setStates(metadata.states || [])
    setRegions(metadata.regions || [])
    setAuthorityTypes(metadata.emergencyAuthorityTypes || ['police', 'civil_defence', 'military', 'other'])
  }, [])

  const loadContacts = useCallback(async () => {
    const { data } = await platformService.getAdminEmergencyContacts(buildParams())
    setContacts(data?.contacts || [])
    setPagination(data?.pagination || { page: 1, limit: LIMIT, total: 0, pages: 1 })
  }, [buildParams])

  const refreshAll = useCallback(async () => {
    setLoading(true)
    try {
      await Promise.all([loadMetadata(), loadContacts()])
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load emergency contacts admin data')
    } finally {
      setLoading(false)
    }
  }, [loadMetadata, loadContacts])

  useEffect(() => {
    refreshAll().catch(() => {})
  }, [refreshAll])

  useEffect(() => {
    const unsubscribe = on('emergency-directory:updated', () => {
      loadContacts().catch(() => {})
    })
    return unsubscribe
  }, [on, loadContacts])

  const applyFilters = async () => {
    setPage(1)
    setLoading(true)
    try {
      const { data } = await platformService.getAdminEmergencyContacts({
        ...buildParams(),
        page: 1,
      })
      setContacts(data?.contacts || [])
      setPagination(data?.pagination || { page: 1, limit: LIMIT, total: 0, pages: 1 })
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to filter emergency contacts')
    } finally {
      setLoading(false)
    }
  }

  const resetFilters = async () => {
    setSearch('')
    setStateFilter('all')
    setRegionFilter('all')
    setTypeFilter('all')
    setActiveFilter('all')
    setVerifiedFilter('all')
    setPage(1)
    setLoading(true)
    try {
      const { data } = await platformService.getAdminEmergencyContacts({ page: 1, limit: LIMIT })
      setContacts(data?.contacts || [])
      setPagination(data?.pagination || { page: 1, limit: LIMIT, total: 0, pages: 1 })
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset emergency contacts filters')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (page === 1) return
    setLoading(true)
    loadContacts()
      .catch((err) => setError(err.response?.data?.message || 'Failed to load emergency contacts'))
      .finally(() => setLoading(false))
  }, [page, loadContacts])

  const openCreateModal = () => {
    setEditing(null)
    hydrateForm(null)
    setModalOpen(true)
  }

  const openEditModal = (contact) => {
    setEditing(contact)
    hydrateForm(contact)
    setModalOpen(true)
  }

  const onFormChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const normalizePayload = () => {
    const phoneNumbers = String(form.phoneNumbers || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)

    if (form.phonePrimary && !phoneNumbers.includes(form.phonePrimary)) {
      phoneNumbers.unshift(form.phonePrimary)
    }

    if (form.phoneSecondary && !phoneNumbers.includes(form.phoneSecondary)) {
      phoneNumbers.push(form.phoneSecondary)
    }

    return {
      name: form.name.trim(),
      agency: form.agency.trim(),
      state: form.state,
      region: form.region || undefined,
      authorityType: form.authorityType,
      category: form.category || 'public_safety',
      phonePrimary: form.phonePrimary.trim(),
      phoneSecondary: form.phoneSecondary.trim() || undefined,
      phoneNumbers,
      email: form.email.trim() || undefined,
      address: form.address.trim() || undefined,
      active: !!form.active,
      isVerifiedOfficial: !!form.isVerifiedOfficial,
    }
  }

  const submitForm = async () => {
    const payload = normalizePayload()
    if (!payload.name || !payload.agency || !payload.state || !payload.phonePrimary) {
      setError('Name, agency, state, and primary phone are required')
      return
    }

    setSaving(true)
    try {
      if (editing?._id) {
        await platformService.updateEmergencyContact(editing._id, payload)
        setNotice('Emergency contact updated successfully')
      } else {
        await platformService.createEmergencyContact(payload)
        setNotice('Emergency contact created successfully')
      }
      setModalOpen(false)
      await loadContacts()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save emergency contact')
    } finally {
      setSaving(false)
    }
  }

  const deleteContact = async (contact) => {
    const confirmed = window.confirm(`Delete ${contact.agency || contact.name} from ${contact.state}?`)
    if (!confirmed) return

    try {
      await platformService.deleteEmergencyContact(contact._id)
      setNotice('Emergency contact deleted')
      await loadContacts()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete emergency contact')
    }
  }

  const exportCsv = async () => {
    try {
      const { data } = await platformService.exportEmergencyContactsCsv(buildParams())
      const blob = data instanceof Blob ? data : new Blob([data], { type: 'text/csv;charset=utf-8' })
      const url = window.URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      const stamp = new Date().toISOString().slice(0, 10)
      anchor.href = url
      anchor.download = `emergency-contacts-${stamp}.csv`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.URL.revokeObjectURL(url)
      setNotice('CSV export completed')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to export CSV')
    }
  }

  const importCsvFromFile = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    const shouldReplace = window.confirm('Import mode: Click OK for REPLACE (delete all then import). Click Cancel for UPSERT (merge/update only).')
    const mode = shouldReplace ? 'replace' : 'upsert'

    try {
      const csv = await file.text()
      const { data } = await platformService.importEmergencyContactsCsv({ csv, mode })
      const summary = data?.summary || {}
      setNotice(`CSV import done (${mode}). Inserted: ${summary.inserted ?? 0}, Modified: ${summary.modified ?? 0}, Skipped: ${summary.skipped ?? 0}.`)
      await loadContacts()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to import CSV')
    } finally {
      if (importFileRef.current) importFileRef.current.value = ''
    }
  }

  const stats = useMemo(() => {
    const active = contacts.filter((c) => c.active !== false).length
    const verified = contacts.filter((c) => c.isVerifiedOfficial !== false).length
    return {
      loaded: contacts.length,
      active,
      inactive: contacts.length - active,
      verified,
    }
  }, [contacts])

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-900">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h1 className="font-extrabold">Emergency Contacts Admin</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Manage verified emergency numbers by state, region, and authority type</p>
          </div>
          <ThemeToggle />
        </header>

        <main className="flex-1 overflow-y-auto p-6 space-y-4">
          {notice && <Alert type="success" message={notice} onClose={() => setNotice('')} />}
          {error && <Alert type="error" message={error} onClose={() => setError('')} />}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="card p-3">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">Loaded contacts</p>
              <p className="mt-1 text-xl font-extrabold text-slate-900 dark:text-white">{stats.loaded}</p>
            </div>
            <div className="card p-3">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">Active</p>
              <p className="mt-1 text-xl font-extrabold text-emerald-600 dark:text-emerald-400">{stats.active}</p>
            </div>
            <div className="card p-3">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">Inactive</p>
              <p className="mt-1 text-xl font-extrabold text-amber-600 dark:text-amber-400">{stats.inactive}</p>
            </div>
            <div className="card p-3">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">Verified</p>
              <p className="mt-1 text-xl font-extrabold text-indigo-600 dark:text-indigo-400">{stats.verified}</p>
            </div>
          </div>

          <div className="card p-4 space-y-3">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-2">
              <div className="relative xl:col-span-2">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  className="input pl-9"
                  placeholder="Search agency, contact, or phone"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select className="select" value={stateFilter} onChange={(e) => setStateFilter(e.target.value)}>
                <option value="all">All states</option>
                {states.map((state) => <option key={state} value={state}>{state}</option>)}
              </select>
              <select className="select" value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)}>
                <option value="all">All regions</option>
                {regions.map((region) => <option key={region} value={region}>{region}</option>)}
              </select>
              <select className="select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                <option value="all">All types</option>
                {authorityTypes.map((type) => <option key={type} value={type}>{authorityLabel(type)}</option>)}
              </select>
              <select className="select" value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)}>
                <option value="all">Active + inactive</option>
                <option value="true">Active only</option>
                <option value="false">Inactive only</option>
              </select>
              <select className="select" value={verifiedFilter} onChange={(e) => setVerifiedFilter(e.target.value)}>
                <option value="all">Verified + unverified</option>
                <option value="true">Verified only</option>
                <option value="false">Unverified only</option>
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button className="btn-secondary" onClick={applyFilters}>
                <Search className="w-4 h-4" /> Apply
              </button>
              <button className="btn-secondary" onClick={resetFilters}>
                <RefreshCcw className="w-4 h-4" /> Reset
              </button>
              <button className="btn-secondary" onClick={exportCsv}>
                <Download className="w-4 h-4" /> Export CSV
              </button>
              <button className="btn-secondary" onClick={() => importFileRef.current?.click()}>
                <Upload className="w-4 h-4" /> Import CSV
              </button>
              <input
                ref={importFileRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={importCsvFromFile}
              />
              <button className="btn-primary ml-auto" onClick={openCreateModal}>
                <Plus className="w-4 h-4" /> Add emergency contact
              </button>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>
                Showing <span className="font-semibold text-slate-700 dark:text-slate-200">{contacts.length}</span> of{' '}
                <span className="font-semibold text-slate-700 dark:text-slate-200">{pagination.total}</span> contacts
              </span>
              <span>Page {pagination.page} / {Math.max(pagination.pages || 1, 1)}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-th">Agency / Contact</th>
                    <th className="table-th">State</th>
                    <th className="table-th">Region</th>
                    <th className="table-th">Type</th>
                    <th className="table-th">Phones</th>
                    <th className="table-th">Status</th>
                    <th className="table-th">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td className="table-td" colSpan={7}>Loading contacts…</td>
                    </tr>
                  ) : contacts.length === 0 ? (
                    <tr>
                      <td className="table-td" colSpan={7}>No emergency contacts found for current filters.</td>
                    </tr>
                  ) : contacts.map((contact) => (
                    <tr key={contact._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="table-td">
                        <p className="font-semibold text-slate-900 dark:text-slate-100">{contact.agency || contact.name}</p>
                        <p className="text-xs text-slate-500">{contact.name}</p>
                      </td>
                      <td className="table-td">{contact.state}</td>
                      <td className="table-td">{contact.region || '-'}</td>
                      <td className="table-td">{authorityLabel(contact.authorityType)}</td>
                      <td className="table-td">
                        {(contact.phoneNumbers || [contact.phonePrimary, contact.phoneSecondary].filter(Boolean)).map((phone) => (
                          <a key={`${contact._id}-${phone}`} className="block text-indigo-600 hover:underline" href={`tel:${phone}`}>
                            {phone}
                          </a>
                        ))}
                      </td>
                      <td className="table-td">
                        <div className="space-y-1 text-xs">
                          <p className={contact.active === false ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}>
                            {contact.active === false ? 'Inactive' : 'Active'}
                          </p>
                          <p className={contact.isVerifiedOfficial === false ? 'text-slate-500' : 'text-indigo-600 dark:text-indigo-400'}>
                            {contact.isVerifiedOfficial === false ? 'Unverified' : 'Verified'}
                          </p>
                        </div>
                      </td>
                      <td className="table-td">
                        <div className="flex gap-2">
                          <button className="btn-secondary text-xs px-3 py-1.5" onClick={() => openEditModal(contact)}>
                            <Pencil className="w-3.5 h-3.5" /> Edit
                          </button>
                          <button className="btn-danger text-xs px-3 py-1.5" onClick={() => deleteContact(contact)}>
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <button
                className="btn-secondary"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <button
                className="btn-secondary"
                disabled={page >= Math.max(pagination.pages || 1, 1) || loading}
                onClick={() => setPage((p) => Math.min(Math.max(pagination.pages || 1, 1), p + 1))}
              >
                Next
              </button>
            </div>
          </div>
        </main>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit emergency contact' : 'Create emergency contact'}
        size="lg"
        footer={(
          <>
            <button className="btn-secondary" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</button>
            <button className="btn-primary" onClick={submitForm} disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Create contact'}
            </button>
          </>
        )}
      >
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="label">Contact name *</label>
            <input className="input" value={form.name} onChange={(e) => onFormChange('name', e.target.value)} />
          </div>
          <div>
            <label className="label">Agency *</label>
            <input className="input" value={form.agency} onChange={(e) => onFormChange('agency', e.target.value)} />
          </div>
          <div>
            <label className="label">State *</label>
            <select className="select" value={form.state} onChange={(e) => onFormChange('state', e.target.value)}>
              <option value="">Select a state</option>
              {states.map((state) => <option key={state} value={state}>{state}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Region</label>
            <select className="select" value={form.region} onChange={(e) => onFormChange('region', e.target.value)}>
              <option value="">Auto from state</option>
              {regions.map((region) => <option key={region} value={region}>{region}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Authority type</label>
            <select className="select" value={form.authorityType} onChange={(e) => onFormChange('authorityType', e.target.value)}>
              {authorityTypes.map((type) => <option key={type} value={type}>{authorityLabel(type)}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Category</label>
            <input className="input" value={form.category} onChange={(e) => onFormChange('category', e.target.value)} />
          </div>
          <div>
            <label className="label">Primary phone *</label>
            <input className="input" value={form.phonePrimary} onChange={(e) => onFormChange('phonePrimary', e.target.value)} />
          </div>
          <div>
            <label className="label">Secondary phone</label>
            <input className="input" value={form.phoneSecondary} onChange={(e) => onFormChange('phoneSecondary', e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <label className="label">Phone numbers (comma-separated)</label>
            <input
              className="input"
              placeholder="112, 199, +2348012345678"
              value={form.phoneNumbers}
              onChange={(e) => onFormChange('phoneNumbers', e.target.value)}
            />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={form.email} onChange={(e) => onFormChange('email', e.target.value)} />
          </div>
          <div>
            <label className="label">Address</label>
            <input className="input" value={form.address} onChange={(e) => onFormChange('address', e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <input type="checkbox" checked={form.active} onChange={(e) => onFormChange('active', e.target.checked)} />
            Contact is active
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={form.isVerifiedOfficial}
              onChange={(e) => onFormChange('isVerifiedOfficial', e.target.checked)}
            />
            Mark as verified official
          </label>
        </div>
      </Modal>
    </div>
  )
}
