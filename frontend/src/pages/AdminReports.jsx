import { useEffect, useMemo, useState } from 'react'
import { CheckCircle, Eye, RefreshCcw, Search, XCircle } from 'lucide-react'
import AdminSidebar from '../components/AdminSidebar'
import Badge from '../components/Badge'
import ThemeToggle from '../components/ThemeToggle'
import Modal from '../components/Modal'
import Alert from '../components/Alert'
import { reportService } from '../services/reportService'

const ALL_STATUSES = ['pending', 'under_review', 'investigating', 'resolved', 'rejected', 'closed']

export default function AdminReports() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [selected, setSelected] = useState(null)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  const reportStats = useMemo(() => {
    const pending = reports.filter((r) => r.status === 'pending').length
    const underReview = reports.filter((r) => r.status === 'under_review' || r.status === 'investigating').length
    const resolved = reports.filter((r) => r.status === 'resolved' || r.status === 'closed').length
    return {
      total: reports.length,
      pending,
      underReview,
      resolved,
    }
  }, [reports])

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
    try {
      await reportService.adminUpdateStatus(reportId, { status: newStatus })
      setNotice(`Report moved to ${newStatus}.`)
      await loadReports()
      setSelected(null)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update report status')
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-900">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h1 className="font-extrabold">Report Moderation</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Simple, focused workflow for review and resolution</p>
          </div>
          <ThemeToggle />
        </header>

        <main className="flex-1 overflow-y-auto p-6 space-y-4">
          {notice && <Alert type="success" message={notice} onClose={() => setNotice('')} />}
          {error && <Alert type="error" message={error} onClose={() => setError('')} />}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="card p-3">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">Total</p>
              <p className="mt-1 text-xl font-extrabold text-slate-900 dark:text-white">{reportStats.total}</p>
            </div>
            <div className="card p-3">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">Pending</p>
              <p className="mt-1 text-xl font-extrabold text-amber-600 dark:text-amber-400">{reportStats.pending}</p>
            </div>
            <div className="card p-3">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">In Review</p>
              <p className="mt-1 text-xl font-extrabold text-indigo-600 dark:text-indigo-400">{reportStats.underReview}</p>
            </div>
            <div className="card p-3">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">Resolved</p>
              <p className="mt-1 text-xl font-extrabold text-emerald-600 dark:text-emerald-400">{reportStats.resolved}</p>
            </div>
          </div>

          <div className="card p-4 flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="input pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title/description" />
            </div>
            <select className="select w-52" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
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
                      <td className="table-td">{r.title}</td>
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
                        <button onClick={() => setSelected(r)} className="btn-secondary text-xs px-3 py-1.5"><Eye className="w-3.5 h-3.5" /> Open</button>
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
        onClose={() => setSelected(null)}
        title={selected?.title || 'Report review'}
        size="lg"
        footer={
          selected && (
            <>
              <button className="btn-danger text-sm" onClick={() => updateStatus(selected._id, 'rejected')}><XCircle className="w-4 h-4" /> Reject</button>
              <button className="btn-secondary text-sm" onClick={() => updateStatus(selected._id, 'under_review')}>Under review</button>
              <button className="btn-success text-sm" onClick={() => updateStatus(selected._id, 'resolved')}><CheckCircle className="w-4 h-4" /> Resolve</button>
            </>
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
          </div>
        )}
      </Modal>
    </div>
  )
}
