import { useEffect, useState } from 'react'
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

  const loadUsers = async ({ search = '', age = 'all' } = {}) => {
    const { data } = await userService.getAllUsers({
      limit: 100,
      search: search || undefined,
      ageGroup: age !== 'all' ? age : undefined,
    })
    setUsers(data.users || [])
  }

  useEffect(() => {
    loadUsers({ search: '', age: 'all' }).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (loading) return

    setLoading(true)
    loadUsers({ search: query, age: ageGroup }).finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ageGroup])

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

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-900">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h1 className="font-extrabold">User Management</h1>
          <ThemeToggle />
        </header>

        <main className="flex-1 overflow-y-auto p-6 space-y-4">
          {notice && <Alert type="success" message={notice} onClose={() => setNotice('')} />}
          {error && <Alert type="error" message={error} onClose={() => setError('')} />}

          <div className="card p-4 flex gap-2">
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
                        <td className="table-td">{u.name}</td>
                        <td className="table-td">{u.email}</td>
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
        </main>
      </div>
    </div>
  )
}
