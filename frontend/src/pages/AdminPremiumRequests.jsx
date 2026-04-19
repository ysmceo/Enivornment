import { useEffect, useMemo, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import AdminSidebar from '../components/AdminSidebar'
import ThemeToggle from '../components/ThemeToggle'
import Badge from '../components/Badge'
import Alert from '../components/Alert'
import { userService } from '../services/reportService'

const REQUEST_STATUSES = ['pending', 'approved', 'rejected']

export default function AdminPremiumRequests() {
  const [requests, setRequests] = useState([])
  const [statusFilter, setStatusFilter] = useState('pending')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [actionLoadingId, setActionLoadingId] = useState('')

  const loadRequests = async (nextStatus = statusFilter) => {
    const { data } = await userService.getPremiumUpgradeRequests({ limit: 100, status: nextStatus })
    setRequests(data?.requests || [])
  }

  useEffect(() => {
    loadRequests(statusFilter)
      .catch((err) => setError(err?.response?.data?.message || 'Unable to load premium requests.'))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (loading) return
    setRefreshing(true)
    loadRequests(statusFilter)
      .catch((err) => setError(err?.response?.data?.message || 'Unable to load premium requests.'))
      .finally(() => setRefreshing(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter])

  const counts = useMemo(() => {
    const pending = requests.filter((r) => r.status === 'pending').length
    const approved = requests.filter((r) => r.status === 'approved').length
    const rejected = requests.filter((r) => r.status === 'rejected').length
    return { pending, approved, rejected }
  }, [requests])

  const refreshNow = async () => {
    setRefreshing(true)
    setError('')
    try {
      await loadRequests(statusFilter)
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to refresh premium requests.')
    } finally {
      setRefreshing(false)
    }
  }

  const approveRequest = async (requestId) => {
    try {
      setActionLoadingId(requestId)
      const { data } = await userService.approvePremiumUpgradeRequest(requestId, {})
      setNotice(data?.message || 'Premium access activated.')
      await loadRequests(statusFilter)
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to approve premium request.')
    } finally {
      setActionLoadingId('')
    }
  }

  const rejectRequest = async (requestId) => {
    const reason = window.prompt('Reason for rejection (optional):', '') || ''
    try {
      setActionLoadingId(requestId)
      const { data } = await userService.rejectPremiumUpgradeRequest(requestId, { reason })
      setNotice(data?.message || 'Premium request rejected.')
      await loadRequests(statusFilter)
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to reject premium request.')
    } finally {
      setActionLoadingId('')
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-indigo-50/40 to-violet-50/40 dark:from-slate-900 dark:via-indigo-950/10 dark:to-violet-950/10">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 px-6 bg-gradient-to-r from-white to-indigo-50/60 dark:from-slate-900 dark:to-indigo-950/20 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h1 className="font-extrabold bg-gradient-to-r from-indigo-700 to-violet-700 dark:from-indigo-300 dark:to-violet-300 bg-clip-text text-transparent">Premium Payment Verification</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Verify manual bank transfers and activate premium access</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={`btn-secondary text-xs inline-flex items-center gap-1 ${refreshing ? 'opacity-70 cursor-not-allowed' : ''}`}
              onClick={() => refreshNow().catch(() => {})}
              disabled={refreshing}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 space-y-4">
          {notice && <Alert type="success" message={notice} onClose={() => setNotice('')} />}
          {error && <Alert type="error" message={error} onClose={() => setError('')} />}

          <section className="grid sm:grid-cols-3 gap-3">
            <div className="card p-3 border border-amber-400/25 bg-gradient-to-br from-amber-500/10 to-transparent shadow-sm">
              <p className="text-[11px] uppercase tracking-wider text-slate-500">Pending</p>
              <p className="mt-1 text-2xl font-bold text-amber-600">{counts.pending}</p>
            </div>
            <div className="card p-3 border border-emerald-400/25 bg-gradient-to-br from-emerald-500/10 to-transparent shadow-sm">
              <p className="text-[11px] uppercase tracking-wider text-slate-500">Approved</p>
              <p className="mt-1 text-2xl font-bold text-emerald-600">{counts.approved}</p>
            </div>
            <div className="card p-3 border border-rose-400/25 bg-gradient-to-br from-rose-500/10 to-transparent shadow-sm">
              <p className="text-[11px] uppercase tracking-wider text-slate-500">Rejected</p>
              <p className="mt-1 text-2xl font-bold text-rose-600">{counts.rejected}</p>
            </div>
          </section>

          <section className="card p-4 flex items-center justify-between gap-3 flex-wrap border border-violet-400/20 bg-gradient-to-r from-violet-500/10 to-transparent">
            <p className="text-sm text-slate-600 dark:text-slate-300">Filter by request status</p>
            <select className="select max-w-[180px]" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              {REQUEST_STATUSES.map((status) => (
                <option key={status} value={status}>{status[0].toUpperCase() + status.slice(1)}</option>
              ))}
            </select>
          </section>

          <section className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-th">User</th>
                    <th className="table-th">Transfer</th>
                    <th className="table-th">Submitted</th>
                    <th className="table-th">Status</th>
                    <th className="table-th">Review</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td className="table-td" colSpan={5}>Loading premium requests…</td>
                    </tr>
                  ) : requests.length === 0 ? (
                    <tr>
                      <td className="table-td" colSpan={5}>No premium requests for this status.</td>
                    </tr>
                  ) : (
                    requests.map((request) => (
                      <tr key={request._id}>
                        <td className="table-td">
                          <p className="font-semibold">{request.userId?.name || 'Unknown user'}</p>
                          <p className="text-xs text-slate-500">{request.userId?.email || 'N/A'}</p>
                          <p className="text-xs text-slate-500 mt-1">Source: {request.submittedVia?.replace('_', ' ') || 'N/A'}</p>
                        </td>
                        <td className="table-td">
                          <p className="font-semibold">{request.transferReference}</p>
                          <p className="text-xs text-slate-500">Amount: {request.transferAmount ? `₦${Number(request.transferAmount).toLocaleString()}` : 'N/A'}</p>
                          <p className="text-xs text-slate-500">Date: {request.transferDate ? new Date(request.transferDate).toLocaleDateString() : 'N/A'}</p>
                          {request.senderName && <p className="text-xs text-slate-500">Sender: {request.senderName}</p>}
                          {request.note && <p className="text-xs text-slate-600 mt-1">Note: {request.note}</p>}
                          {request.paymentReceiptUrl ? (
                            <a
                              href={request.paymentReceiptUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-indigo-600 hover:text-indigo-500 underline mt-1 inline-block"
                            >
                              View Receipt
                            </a>
                          ) : (
                            <p className="text-xs text-rose-500 mt-1">Receipt not uploaded</p>
                          )}
                        </td>
                        <td className="table-td">{request.createdAt ? new Date(request.createdAt).toLocaleString() : 'N/A'}</td>
                        <td className="table-td"><Badge status={request.status} label={request.status} dot /></td>
                        <td className="table-td">
                          {request.status === 'pending' ? (
                            <div className="flex gap-2">
                              <button
                                type="button"
                                className="btn-secondary text-xs px-3 py-1.5"
                                onClick={() => approveRequest(request._id).catch(() => {})}
                                disabled={actionLoadingId === request._id}
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                className="btn-danger text-xs px-3 py-1.5"
                                onClick={() => rejectRequest(request._id).catch(() => {})}
                                disabled={actionLoadingId === request._id}
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <div>
                              <p className="text-xs text-slate-500">Reviewed {request.reviewedAt ? new Date(request.reviewedAt).toLocaleString() : ''}</p>
                              {request.adminNote && <p className="text-xs text-slate-600 mt-1">{request.adminNote}</p>}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
