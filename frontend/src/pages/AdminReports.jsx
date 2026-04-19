import { useEffect, useMemo, useState } from 'react'
import { Eye, RefreshCcw, Search } from 'lucide-react'
import AdminSidebar from '../components/AdminSidebar'
import Badge from '../components/Badge'
import ThemeToggle from '../components/ThemeToggle'
import Modal from '../components/Modal'
import Alert from '../components/Alert'
import { reportService } from '../services/reportService'

const ALL_STATUSES = ['pending', 'in_progress', 'under_review', 'investigating', 'verified', 'solved', 'resolved', 'rejected', 'closed']
const STATUS_LABELS = {
  pending: 'Pending',
  in_progress: 'In Progress',
  under_review: 'Under Review',
  investigating: 'Investigating',
  verified: 'Verified',
  solved: 'Solved',
  resolved: 'Resolved',
  rejected: 'Rejected',
  closed: 'Closed',
}

const STATUS_TRANSITIONS = {
  pending: ['in_progress', 'under_review', 'rejected'],
  in_progress: ['under_review', 'investigating', 'verified', 'solved', 'rejected'],
  under_review: ['investigating', 'verified', 'solved', 'rejected'],
  investigating: ['verified', 'solved', 'rejected'],
  verified: ['solved', 'resolved', 'closed'],
  solved: ['resolved', 'closed'],
  resolved: ['closed'],
  rejected: ['closed', 'in_progress'],
  closed: [],
}

const getRecommendedStatuses = (currentStatus) => {
  const normalizedCurrent = ALL_STATUSES.includes(currentStatus) ? currentStatus : 'pending'
  const nextStatuses = STATUS_TRANSITIONS[normalizedCurrent] || []
  return [normalizedCurrent, ...nextStatuses.filter((status) => status !== normalizedCurrent)]
}

export default function AdminReports() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [selected, setSelected] = useState(null)
  const [modalStatus, setModalStatus] = useState('')
  const [showAllModalStatuses, setShowAllModalStatuses] = useState(false)
  const [statusNote, setStatusNote] = useState('')
  const [evidenceRequestNote, setEvidenceRequestNote] = useState('')
  const [requestingEvidence, setRequestingEvidence] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  const reportStats = useMemo(() => {
    const pending = reports.filter((r) => r.status === 'pending').length
    const underReview = reports.filter((r) => ['in_progress', 'under_review', 'investigating'].includes(r.status)).length
    const resolved = reports.filter((r) => ['solved', 'resolved', 'closed'].includes(r.status)).length
    return {
      total: reports.length,
      pending,
      underReview,
      resolved,
    }
  }, [reports])

  const modalStatusOptions = useMemo(
    () => getRecommendedStatuses(selected?.status),
    [selected?.status]
  )

  const effectiveModalStatusOptions = useMemo(
    () => (showAllModalStatuses ? ALL_STATUSES : modalStatusOptions),
    [showAllModalStatuses, modalStatusOptions]
  )

  const loadReports = async () => {
    const { data } = await reportService.adminGetAllReports({ limit: 100, search, status: status || undefined })
    setReports(data.reports || [])
  }

  useEffect(() => {
    loadReports().finally(() => setLoading(false))
  }, [])

  const applyFilters = async () => {
    setLoading(true)
    try {
      await loadReports()
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (reportId, newStatus) => {
    if (!newStatus) return

    try {
      await reportService.adminUpdateStatus(reportId, {
        status: newStatus,
        adminNotes: statusNote?.trim() || undefined,
      })
      setNotice(`Report moved to ${STATUS_LABELS[newStatus] || newStatus}.`)
      await loadReports()
      setSelected(null)
      setModalStatus('')
      setStatusNote('')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update report status')
    }
  }

  const requestEvidence = async (reportId) => {
    const trimmedNote = String(evidenceRequestNote || '').trim()
    if (!trimmedNote) {
      setError('Please include what additional evidence is needed.')
      return
    }

    try {
      setRequestingEvidence(true)
      await reportService.adminRequestEvidence(reportId, { note: trimmedNote })
      setNotice('Additional evidence request sent to user.')
      setEvidenceRequestNote('')
      await loadReports()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to request additional evidence')
    } finally {
      setRequestingEvidence(false)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-indigo-50/40 to-violet-50/40 dark:from-slate-900 dark:via-indigo-950/10 dark:to-violet-950/10">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 px-6 bg-gradient-to-r from-white to-indigo-50/60 dark:from-slate-900 dark:to-indigo-950/20 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h1 className="font-extrabold bg-gradient-to-r from-indigo-700 to-violet-700 dark:from-indigo-300 dark:to-violet-300 bg-clip-text text-transparent">Report Moderation</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Simple, focused workflow for review and resolution</p>
          </div>
          <ThemeToggle />
        </header>

        <main className="flex-1 overflow-y-auto p-6 space-y-4">
          {notice && <Alert type="success" message={notice} onClose={() => setNotice('')} />}
          {error && <Alert type="error" message={error} onClose={() => setError('')} />}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="card p-3 border border-indigo-400/25 bg-gradient-to-br from-indigo-500/10 to-transparent shadow-sm">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">Total</p>
              <p className="mt-1 text-xl font-extrabold text-slate-900 dark:text-white">{reportStats.total}</p>
            </div>
            <div className="card p-3 border border-amber-400/25 bg-gradient-to-br from-amber-500/10 to-transparent shadow-sm">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">Pending</p>
              <p className="mt-1 text-xl font-extrabold text-amber-600 dark:text-amber-400">{reportStats.pending}</p>
            </div>
            <div className="card p-3 border border-cyan-400/25 bg-gradient-to-br from-cyan-500/10 to-transparent shadow-sm">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">In Review</p>
              <p className="mt-1 text-xl font-extrabold text-indigo-600 dark:text-indigo-400">{reportStats.underReview}</p>
            </div>
            <div className="card p-3 border border-emerald-400/25 bg-gradient-to-br from-emerald-500/10 to-transparent shadow-sm">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">Resolved</p>
              <p className="mt-1 text-xl font-extrabold text-emerald-600 dark:text-emerald-400">{reportStats.resolved}</p>
            </div>
          </div>

          <div className="card p-4 flex flex-wrap gap-3 items-center border border-violet-400/20 bg-gradient-to-r from-violet-500/10 to-transparent">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="input pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search case ID, email, title, description" />
            </div>
            <select className="select w-52" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              {ALL_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s] || s}</option>)}
            </select>
            <button className="btn-secondary" onClick={applyFilters}>Apply</button>
            <button
              className="btn-secondary"
              onClick={() => {
                setSearch('')
                setStatus('')
                setLoading(true)
                reportService
                  .adminGetAllReports({ limit: 100 })
                  .then(({ data }) => setReports(data.reports || []))
                  .finally(() => setLoading(false))
              }}
            >
              <RefreshCcw className="w-4 h-4" /> Reset
            </button>
          </div>

          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-800/30">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Showing <span className="font-semibold text-slate-700 dark:text-slate-200">{reports.length}</span> reports
              </p>
              {status ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Filter: <span className="font-semibold text-slate-700 dark:text-slate-200 capitalize">{status.replaceAll('_', ' ')}</span>
                </p>
              ) : null}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-th">Title</th>
                    <th className="table-th">Reporter</th>
                    <th className="table-th">Category</th>
                    <th className="table-th">Severity</th>
                    <th className="table-th">Risk</th>
                    <th className="table-th">Status</th>
                    <th className="table-th">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td className="table-td" colSpan={7}>Loading reports…</td>
                    </tr>
                  ) : reports.length === 0 ? (
                    <tr>
                      <td className="table-td" colSpan={7}>No reports found for current filters.</td>
                    </tr>
                  ) : reports.map((r) => (
                    <tr key={r._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="table-td">
                        <p className="font-semibold">{r.title}</p>
                        <p className="text-[11px] text-indigo-600 dark:text-indigo-300">{r.caseId || 'No case ID'}</p>
                      </td>
                      <td className="table-td">{r.submittedBy?.name || 'Anonymous'}</td>
                      <td className="table-td capitalize">{r.category?.replaceAll('_', ' ')}</td>
                      <td className="table-td capitalize">{r.severity || 'medium'}</td>
                      <td className="table-td">{r.riskScore ?? 0}</td>
                      <td className="table-td">
                        {r.status === 'pending' ? (
                          <span className="inline-flex items-center rounded-full border border-amber-300 dark:border-amber-700 bg-amber-100 dark:bg-amber-900/30 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                            Pending Admin Approval
                          </span>
                        ) : (
                          <Badge status={r.status} dot />
                        )}
                      </td>
                      <td className="table-td">
                        <button
                          onClick={() => {
                            setSelected(r)
                            setModalStatus(r.status || 'pending')
                            setShowAllModalStatuses(false)
                            setStatusNote('')
                            setEvidenceRequestNote('')
                          }}
                          className="btn-secondary text-xs px-3 py-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" /> Open
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      <Modal
        open={!!selected}
        onClose={() => {
          setSelected(null)
          setModalStatus('')
          setShowAllModalStatuses(false)
          setStatusNote('')
        }}
        title={selected?.title || 'Report review'}
        size="lg"
        footer={
          selected && (
            <div className="w-full flex flex-wrap items-end justify-end gap-2">
              <div className="min-w-[220px]">
                <label className="label">Case progress</label>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {showAllModalStatuses ? 'All statuses (override mode)' : 'Recommended next steps for this case'}
                  </p>
                  <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={showAllModalStatuses}
                      onChange={(e) => {
                        const enabled = e.target.checked
                        setShowAllModalStatuses(enabled)
                        if (!enabled && !modalStatusOptions.includes(modalStatus)) {
                          setModalStatus(selected?.status || 'pending')
                        }
                      }}
                    />
                    Show all statuses
                  </label>
                </div>
                <select
                  className="select"
                  value={modalStatus}
                  onChange={(e) => setModalStatus(e.target.value)}
                >
                  {effectiveModalStatusOptions.map((s) => (
                    <option key={s} value={s}>{STATUS_LABELS[s] || s}</option>
                  ))}
                </select>
              </div>

              <button
                className="btn-primary text-sm"
                onClick={() => updateStatus(selected._id, modalStatus)}
                disabled={!modalStatus}
              >
                Update case progress
              </button>
            </div>
          )
        }
      >
        {selected && (
          <div className="space-y-3">
            {selected.status === 'pending' ? (
              <span className="inline-flex items-center rounded-full border border-amber-300 dark:border-amber-700 bg-amber-100 dark:bg-amber-900/30 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                Pending Admin Approval
              </span>
            ) : (
              <Badge status={selected.status} dot />
            )}
            <p className="text-xs text-slate-500">
              <span className="font-semibold">Case ID:</span> {selected.caseId || 'N/A'} ·{' '}
              <span className="font-semibold">Severity:</span> {selected.severity || 'medium'} ·{' '}
              <span className="font-semibold">Risk score:</span> {selected.riskScore ?? 0}
            </p>
            {selected.moderation?.flagged && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/20 p-3 text-xs text-amber-700 dark:text-amber-300">
                Moderation flagged this report for manual review.
              </div>
            )}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 bg-slate-50 dark:bg-slate-800/50">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Description</p>
              <p className="text-sm text-slate-700 dark:text-slate-200">{selected.description || 'No description provided.'}</p>
            </div>

            <div>
              <label className="label">Request more evidence (optional admin action)</label>
              <textarea
                className="textarea"
                rows={3}
                value={evidenceRequestNote}
                onChange={(e) => setEvidenceRequestNote(e.target.value)}
                placeholder="e.g. Please upload a clearer video angle showing vehicle plate and timestamp..."
              />
              <div className="mt-2">
                <button
                  type="button"
                  className="btn-secondary text-sm"
                  onClick={() => requestEvidence(selected._id)}
                  disabled={requestingEvidence}
                >
                  {requestingEvidence ? 'Requesting…' : 'Request Additional Evidence'}
                </button>
              </div>
            </div>

            <div>
              <label className="label">Progress / Conclusion note (optional)</label>
              <textarea
                className="textarea"
                rows={3}
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                placeholder="Add an update users should see in case tracking"
              />
            </div>

            <div className="rounded-xl border border-indigo-200 dark:border-indigo-800 p-3 bg-indigo-50/60 dark:bg-indigo-900/20">
              <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 mb-1">User Case Journey Feedback</p>
              {selected.experience?.submittedAt ? (
                <div className="space-y-1 text-sm text-slate-700 dark:text-slate-200">
                  <p><span className="font-semibold">Rating:</span> {selected.experience.rating || 'N/A'} / 5</p>
                  <p><span className="font-semibold">Journey:</span> {selected.experience.journey || 'N/A'}</p>
                  <p className="text-xs text-slate-500">
                    Submitted: {new Date(selected.experience.submittedAt).toLocaleString()}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-slate-500">No user journey feedback submitted yet.</p>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
