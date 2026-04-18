import { useEffect, useState } from 'react'
import { Eye } from 'lucide-react'
import AdminSidebar from '../components/AdminSidebar'
import ThemeToggle from '../components/ThemeToggle'
import Badge from '../components/Badge'
import Modal from '../components/Modal'
import Alert from '../components/Alert'
import { userService } from '../services/reportService'

export default function AdminVerification() {
  const [users, setUsers] = useState([])
  const [selected, setSelected] = useState(null)
  const [identityAssets, setIdentityAssets] = useState(null)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  const loadPending = async () => {
    const { data } = await userService.getAllUsers({ verificationStatus: 'pending', limit: 100 })
    setUsers(data.users || [])
  }

  useEffect(() => {
    loadPending().catch(() => setError('Failed to load verification queue'))
  }, [])

  const openReview = async (u) => {
    setSelected(u)
    setIdentityAssets(null)
    try {
      const { data } = await userService.getIdentityReviewAssets(u._id)
      setIdentityAssets(data.assets || null)
    } catch {
      setIdentityAssets(null)
    }
  }

  const decide = async (action) => {
    if (!selected) return

    try {
      await userService.verifyGovernmentId(selected._id, {
        action,
        rejectionReason: action === 'reject' ? 'Document verification failed.' : undefined,
      })
      setNotice(`ID ${action === 'approve' ? 'approved' : 'rejected'} for ${selected.name}`)
      setSelected(null)
      await loadPending()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to process verification')
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-900">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h1 className="font-extrabold">ID Verification Queue</h1>
          <ThemeToggle />
        </header>

        <main className="flex-1 overflow-y-auto p-6 space-y-4">
          {notice && <Alert type="success" message={notice} onClose={() => setNotice('')} />}
          {error && <Alert type="error" message={error} onClose={() => setError('')} />}

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-th">Name</th>
                    <th className="table-th">Email</th>
                    <th className="table-th">Verification</th>
                    <th className="table-th">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u._id}>
                      <td className="table-td">{u.name}</td>
                      <td className="table-td">{u.email}</td>
                      <td className="table-td"><Badge status={u.idVerificationStatus || 'none'} /></td>
                      <td className="table-td">
                        <button className="btn-secondary text-xs px-3 py-1.5" onClick={() => openReview(u)}><Eye className="w-3.5 h-3.5" /> Review</button>
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
        title={selected ? `Verify: ${selected.name}` : 'Verify ID'}
        footer={
          selected && (
            <>
              <button className="btn-danger text-sm" onClick={() => decide('reject')}>Reject</button>
              <button className="btn-success text-sm" onClick={() => decide('approve')}>Approve</button>
            </>
          )
        }
      >
        {selected && (
          <div className="space-y-3">
            <p className="text-sm text-slate-500">Review uploaded government ID and selfie, then choose an action.</p>

            <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 text-sm space-y-1">
              <p><span className="font-semibold">ID type:</span> {identityAssets?.idCardType || 'Not provided'}</p>
              <p><span className="font-semibold">ID number (last 4):</span> {identityAssets?.governmentIdNumberLast4 || 'Not available'}</p>
              <p><span className="font-semibold">Provider:</span> {identityAssets?.verificationProvider || 'Not configured'}</p>
              <p><span className="font-semibold">Provider status:</span> {identityAssets?.verificationProviderStatus || 'N/A'}</p>
              {identityAssets?.verificationReference && (
                <p><span className="font-semibold">Reference:</span> {identityAssets.verificationReference}</p>
              )}
              {identityAssets?.verificationError && (
                <p className="text-amber-600 dark:text-amber-400"><span className="font-semibold">Provider note:</span> {identityAssets.verificationError}</p>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-slate-500">Government ID</p>
              {identityAssets?.governmentIdUrl ? (
                <a href={identityAssets.governmentIdUrl} target="_blank" rel="noreferrer" className="text-indigo-600 text-sm font-semibold">Open uploaded ID document</a>
              ) : (
                <p className="text-sm text-slate-500">Government ID missing.</p>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-slate-500">Verification Selfie</p>
              {identityAssets?.selfieUrl ? (
                <a href={identityAssets.selfieUrl} target="_blank" rel="noreferrer" className="text-indigo-600 text-sm font-semibold">Open uploaded selfie</a>
              ) : (
                <p className="text-sm text-slate-500">Verification selfie missing.</p>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
