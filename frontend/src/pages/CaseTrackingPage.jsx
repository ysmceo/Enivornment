import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Search, Clock3, ShieldCheck, AlertTriangle, Copy } from 'lucide-react'
import { reportService } from '../services/reportService'
import Badge from '../components/Badge'
import { useAuth } from '../context/AuthContext'

const REPORT_STATUS_LABELS = {
  pending: 'Pending',
  in_progress: 'In Progress',
  under_review: 'Under Review',
  investigating: 'Under Investigation',
  verified: 'Verified',
  solved: 'Solved',
  resolved: 'Resolved',
  rejected: 'Rejected',
  closed: 'Closed',
}

const getStatusLabel = (status) => REPORT_STATUS_LABELS[status] || status || 'Unknown'

export default function CaseTrackingPage() {
  const { user } = useAuth()
  const [caseId, setCaseId] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState(null)
  const [recentReports, setRecentReports] = useState([])
  const [copied, setCopied] = useState(false)

  const sortedHistory = useMemo(() => {
    if (!Array.isArray(report?.statusHistory)) return []
    return [...report.statusHistory].sort((a, b) => new Date(b.changedAt || 0) - new Date(a.changedAt || 0))
  }, [report])

  const loadRecentReports = async () => {
    const { data } = await reportService.getMyReports({ limit: 10 })
    setRecentReports(data?.reports || [])
  }

  useEffect(() => {
    loadRecentReports().catch(() => {})
  }, [])

  useEffect(() => {
    if (user?.email) setEmail(user.email)
  }, [user?.email])

  const trackByCaseId = async (targetCaseId = caseId) => {
    const normalized = String(targetCaseId || '').trim().toUpperCase()
    const normalizedEmail = String(email || '').trim().toLowerCase()
    if (!normalized) {
      toast.error('Please enter a case ID')
      return
    }
    if (!normalizedEmail) {
      toast.error('Please enter your email used during case submission')
      return
    }

    try {
      setLoading(true)
      const { data } = await reportService.trackCaseWithEmail({
        caseId: normalized,
        email: normalizedEmail,
      })
      setCaseId(normalized)
      setReport(data?.report || null)
      toast.success(`Tracking updates loaded for ${normalized}`)
    } catch (err) {
      setReport(null)
      toast.error(err.response?.data?.message || 'Case not found')
    } finally {
      setLoading(false)
    }
  }

  const copyCaseCode = async (value) => {
    const caseCode = String(value || '').trim()
    if (!caseCode) return

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(caseCode)
      } else {
        const tempInput = document.createElement('textarea')
        tempInput.value = caseCode
        tempInput.style.position = 'fixed'
        tempInput.style.opacity = '0'
        document.body.appendChild(tempInput)
        tempInput.focus()
        tempInput.select()
        document.execCommand('copy')
        document.body.removeChild(tempInput)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
      toast.success('Case code copied to clipboard')
    } catch {
      toast.error('Unable to copy case code automatically')
    }
  }

  return (
    <main className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      <section className="card p-5 border border-indigo-300/40 bg-gradient-to-r from-indigo-500/10 via-violet-500/10 to-sky-500/10">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Track Your Case</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
          Enter your generated case ID to view live progress and admin updates in real time.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <input
            className="input flex-1 min-w-[240px]"
            placeholder="CASE-YYYYMMDD-XXXXXXXX"
            value={caseId}
            onChange={(e) => setCaseId(e.target.value)}
          />
          <input
            className="input flex-1 min-w-[240px]"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button type="button" className="btn-primary" onClick={() => trackByCaseId()} disabled={loading}>
            <Search className="w-4 h-4" /> {loading ? 'Tracking…' : 'Track Case'}
          </button>
        </div>
      </section>

      <section className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-5 space-y-4">
          <h2 className="text-lg font-semibold">Case Progress</h2>

          {!report ? (
            <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-6 text-sm text-slate-500">
              No case selected yet. Enter a case ID above or pick one from recent submissions.
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-slate-50/70 dark:bg-slate-900/40">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-slate-900 dark:text-white">{report.title}</p>
                  <Badge status={report.status} label={getStatusLabel(report.status)} dot />
                </div>
                <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-1 font-semibold">Case ID: {report.caseId}</p>
                <button type="button" className="btn-secondary mt-2" onClick={() => copyCaseCode(report.caseId)}>
                  <Copy className="w-4 h-4" /> {copied ? 'Copied!' : 'Copy Case Code'}
                </button>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">{report.state} · {report.category}</p>
                <div className="mt-3 grid sm:grid-cols-2 gap-2 text-xs text-slate-500">
                  <p>Submitted: {report.createdAt ? new Date(report.createdAt).toLocaleString() : 'N/A'}</p>
                  <p>Last Updated: {report.updatedAt ? new Date(report.updatedAt).toLocaleString() : 'N/A'}</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold">Status Timeline</p>
                {sortedHistory.length === 0 ? (
                  <p className="text-sm text-slate-500">No status history available yet.</p>
                ) : (
                  <div className="space-y-2">
                    {sortedHistory.map((item, idx) => (
                      <div
                        key={`${item.status}-${item.changedAt || idx}`}
                        className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 flex items-start justify-between gap-2"
                      >
                        <div>
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                            {getStatusLabel(item.status)}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">{item.note || 'Status updated by administrator'}</p>
                        </div>
                        <p className="text-xs text-slate-500 whitespace-nowrap">
                          {item.changedAt ? new Date(item.changedAt).toLocaleString() : 'N/A'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <aside className="space-y-4">
          <div className="card p-4">
            <p className="text-sm font-semibold mb-3">Recent Submissions</p>
            <div className="space-y-2">
              {recentReports.length === 0 ? (
                <p className="text-xs text-slate-500">No recent reports found.</p>
              ) : (
                recentReports.map((item) => (
                  <button
                    key={item._id}
                    type="button"
                    onClick={() => trackByCaseId(item.caseId)}
                    className="w-full text-left rounded-lg border border-slate-200 dark:border-slate-700 p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">{item.caseId || 'No case ID'}</p>
                    <p className="text-sm text-slate-800 dark:text-slate-100 line-clamp-1">{item.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{getStatusLabel(item.status)}</p>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="card p-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
            <p className="font-semibold">Status Meaning</p>
            <p className="flex items-center gap-2"><Clock3 className="w-4 h-4 text-amber-500" /> Pending: awaiting first admin review.</p>
            <p className="flex items-center gap-2"><Search className="w-4 h-4 text-blue-500" /> In Progress: admins are actively processing your case.</p>
            <p className="flex items-center gap-2"><Search className="w-4 h-4 text-indigo-500" /> Under Investigation: actively being reviewed.</p>
            <p className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-500" /> Solved/Resolved: case work completed.</p>
            <p className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-rose-500" /> Rejected: insufficient or invalid evidence.</p>
          </div>
        </aside>
      </section>
    </main>
  )
}
