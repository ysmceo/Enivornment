import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import AdminSidebar from '../components/AdminSidebar'
import ThemeToggle from '../components/ThemeToggle'
import Badge from '../components/Badge'
import Alert from '../components/Alert'
import { userService } from '../services/reportService'

const getAgeFromDate = (dateInput) => {
  const dob = new Date(dateInput)
  if (Number.isNaN(dob.getTime())) return null

  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const monthDiff = today.getMonth() - dob.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1
  }

  return age
}

const getAgeGroup = (user) => {
  if (typeof user?.isAdult === 'boolean') {
    return user.isAdult
      ? { status: 'adult', label: 'Adult (18+)' }
      : { status: 'minor', label: 'Minor (<18)' }
  }

  if (user?.dateOfBirth) {
    const age = getAgeFromDate(user.dateOfBirth)
    if (age !== null) {
      return age >= 18
        ? { status: 'adult', label: `Adult (${age})` }
        : { status: 'minor', label: `Minor (${age})` }
    }
  }

  return { status: 'unknown', label: 'Unknown' }
}

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [ageGroup, setAgeGroup] = useState('all')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [avatarErrors, setAvatarErrors] = useState({})
  const [premiumRequests, setPremiumRequests] = useState([])
  const [premiumFilter, setPremiumFilter] = useState('pending')
  const [premiumActionLoadingId, setPremiumActionLoadingId] = useState('')

  const userSummary = useMemo(() => {
    const active = users.filter((u) => u?.isActive !== false).length
    const inactive = users.filter((u) => u?.isActive === false).length
    const pendingVerification = users.filter((u) => u?.idVerificationStatus === 'pending').length
    return { active, inactive, pendingVerification }
  }, [users])

  const premiumSummary = useMemo(() => {
    const pending = premiumRequests.filter((r) => r?.status === 'pending').length
    const approved = premiumRequests.filter((r) => r?.status === 'approved').length
    const rejected = premiumRequests.filter((r) => r?.status === 'rejected').length
    return { pending, approved, rejected }
  }, [premiumRequests])

  const markAvatarError = (userId) => {
    setAvatarErrors((prev) => ({ ...prev, [userId]: true }))
  }

  const getInitials = (name = '') => {
    const tokens = String(name || '').trim().split(/\s+/).filter(Boolean)
    if (!tokens.length) return 'U'
    return tokens.slice(0, 2).map((token) => token[0]?.toUpperCase() || '').join('')
  }

  const loadUsers = async ({ search = '', age = 'all' } = {}) => {
    const { data } = await userService.getAllUsers({
      limit: 100,
      search: search || undefined,
      ageGroup: age !== 'all' ? age : undefined,
    })
    setUsers(data.users || [])
  }

  const loadPremiumRequests = async (status = premiumFilter) => {
    const { data } = await userService.getPremiumUpgradeRequests({ limit: 100, status })
    setPremiumRequests(data?.requests || [])
  }

  useEffect(() => {
    loadUsers({ search: '', age: 'all' }).finally(() => setLoading(false))
    loadPremiumRequests('pending').catch(() => {})
  }, [])

  useEffect(() => {
    if (loading) return

    setLoading(true)
    loadUsers({ search: query, age: ageGroup }).finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ageGroup])

  useEffect(() => {
    loadPremiumRequests(premiumFilter).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [premiumFilter])

  const toggleStatus = async (id) => {
    try {
      const { data } = await userService.toggleUserStatus(id)
      setNotice(data.message)
      await loadUsers({ search: query, age: ageGroup })
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update user')
    }
  }

  const runSearch = async () => {
    setLoading(true)
    try {
      await loadUsers({ search: query, age: ageGroup })
    } finally {
      setLoading(false)
    }
  }

  const approvePremiumRequest = async (requestId) => {
    try {
      setPremiumActionLoadingId(requestId)
      const { data } = await userService.approvePremiumUpgradeRequest(requestId, {})
      setNotice(data?.message || 'Premium request approved')
      await Promise.all([
        loadUsers({ search: query, age: ageGroup }),
        loadPremiumRequests(premiumFilter),
      ])
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to approve premium request')
    } finally {
      setPremiumActionLoadingId('')
    }
  }

  const rejectPremiumRequest = async (requestId) => {
    const reason = window.prompt('Reason for rejection (optional):', '') || ''
    try {
      setPremiumActionLoadingId(requestId)
      const { data } = await userService.rejectPremiumUpgradeRequest(requestId, { reason })
      setNotice(data?.message || 'Premium request rejected')
      await Promise.all([
        loadUsers({ search: query, age: ageGroup }),
        loadPremiumRequests(premiumFilter),
      ])
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reject premium request')
    } finally {
      setPremiumActionLoadingId('')
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-indigo-50/40 to-violet-50/40 dark:from-slate-900 dark:via-indigo-950/10 dark:to-violet-950/10">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 px-6 bg-gradient-to-r from-white to-indigo-50/60 dark:from-slate-900 dark:to-indigo-950/20 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h1 className="font-extrabold bg-gradient-to-r from-indigo-700 to-violet-700 dark:from-indigo-300 dark:to-violet-300 bg-clip-text text-transparent">User Management</h1>
          <ThemeToggle />
        </header>

        <main className="flex-1 overflow-y-auto p-6 space-y-4">
          {notice && <Alert type="success" message={notice} onClose={() => setNotice('')} />}
          {error && <Alert type="error" message={error} onClose={() => setError('')} />}

          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="card p-3 border border-emerald-400/25 bg-gradient-to-br from-emerald-500/10 to-transparent">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">Active users</p>
              <p className="mt-1 text-xl font-extrabold text-emerald-600 dark:text-emerald-400">{userSummary.active}</p>
            </div>
            <div className="card p-3 border border-slate-400/25 bg-gradient-to-br from-slate-500/10 to-transparent">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">Inactive users</p>
              <p className="mt-1 text-xl font-extrabold text-slate-700 dark:text-slate-200">{userSummary.inactive}</p>
            </div>
            <div className="card p-3 border border-amber-400/25 bg-gradient-to-br from-amber-500/10 to-transparent">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">Pending verification</p>
              <p className="mt-1 text-xl font-extrabold text-amber-600 dark:text-amber-400">{userSummary.pendingVerification}</p>
            </div>
          </section>

          <div className="card p-4 flex gap-2 border border-violet-400/20 bg-gradient-to-r from-violet-500/10 to-transparent">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="input pl-9" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or email" />
            </div>
            <select className="select max-w-[180px]" value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)}>
              <option value="all">All Age Groups</option>
              <option value="adult">Adults (18+)</option>
              <option value="minor">Minors (&lt;18)</option>
              <option value="unknown">Unknown</option>
            </select>
            <button className="btn-secondary" onClick={runSearch}>Search</button>
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-th">Name</th>
                    <th className="table-th">Email</th>
                    <th className="table-th">Role</th>
                    <th className="table-th">Age Group</th>
                    <th className="table-th">Verification</th>
                    <th className="table-th">Account</th>
                    <th className="table-th">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {!loading && users.map((u) => {
                    const ageGroup = getAgeGroup(u)

                    return (
                      <tr key={u._id}>
                        <td className="table-td">
                          <div className="flex items-center gap-2.5">
                            {u.profilePhoto && !avatarErrors[u._id] ? (
                              <img
                                src={u.profilePhoto}
                                alt={`${u.name || 'User'} profile`}
                                className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                                onError={() => markAvatarError(u._id)}
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 text-xs font-semibold flex items-center justify-center">
                                {getInitials(u.name)}
                              </div>
                            )}
                            <span className="font-medium">{u.name}</span>
                          </div>
                        </td>
                        <td className="table-td">{u.email}</td>
                        <td className="table-td"><Badge status={u.role || 'user'} label={u.role || 'user'} dot /></td>
                        <td className="table-td"><Badge status={ageGroup.status} label={ageGroup.label} dot /></td>
                        <td className="table-td"><Badge status={u.idVerificationStatus || 'none'} /></td>
                        <td className="table-td"><Badge status={u.isActive ? 'active' : 'suspended'} dot /></td>
                        <td className="table-td">
                          <button className="btn-secondary text-xs px-3 py-1.5" onClick={() => toggleStatus(u._id)}>
                            {u.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <h2 className="font-semibold">Premium Payment Requests</h2>
              <select className="select max-w-[180px]" value={premiumFilter} onChange={(e) => setPremiumFilter(e.target.value)}>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/30 flex flex-wrap gap-3 text-xs">
              <span className="text-amber-700 dark:text-amber-300 font-semibold">Pending: {premiumSummary.pending}</span>
              <span className="text-emerald-700 dark:text-emerald-300 font-semibold">Approved: {premiumSummary.approved}</span>
              <span className="text-rose-700 dark:text-rose-300 font-semibold">Rejected: {premiumSummary.rejected}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-th">User</th>
                    <th className="table-th">Reference</th>
                    <th className="table-th">Amount</th>
                    <th className="table-th">Submitted</th>
                    <th className="table-th">Status</th>
                    <th className="table-th">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {premiumRequests.map((req) => (
                    <tr key={req._id}>
                      <td className="table-td">
                        <p className="font-medium">{req.userId?.name || 'Unknown user'}</p>
                        <p className="text-xs text-slate-500">{req.userId?.email || 'N/A'}</p>
                      </td>
                      <td className="table-td">
                        <p className="font-medium">{req.transferReference}</p>
                        {req.senderName && <p className="text-xs text-slate-500">Sender: {req.senderName}</p>}
                        {req.paymentReceiptUrl ? (
                          <a
                            href={req.paymentReceiptUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-indigo-600 hover:text-indigo-500 underline mt-1 inline-block"
                          >
                            View Receipt
                          </a>
                        ) : (
                          <p className="text-xs text-rose-500 mt-1">No receipt</p>
                        )}
                      </td>
                      <td className="table-td">{req.transferAmount ? `₦${Number(req.transferAmount).toLocaleString()}` : 'N/A'}</td>
                      <td className="table-td">{req.createdAt ? new Date(req.createdAt).toLocaleString() : 'N/A'}</td>
                      <td className="table-td"><Badge status={req.status} label={req.status} dot /></td>
                      <td className="table-td">
                        {req.status === 'pending' ? (
                          <div className="flex gap-2">
                            <button
                              className="btn-secondary text-xs px-3 py-1.5"
                              onClick={() => approvePremiumRequest(req._id)}
                              disabled={premiumActionLoadingId === req._id}
                            >
                              Approve
                            </button>
                            <button
                              className="btn-danger text-xs px-3 py-1.5"
                              onClick={() => rejectPremiumRequest(req._id)}
                              disabled={premiumActionLoadingId === req._id}
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500">Reviewed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
