import { useEffect, useState } from 'react'
import { FileWarning, ShieldCheck, Users, Clock } from 'lucide-react'
import { Link } from 'react-router-dom'
import AdminSidebar from '../components/AdminSidebar'
import ThemeToggle from '../components/ThemeToggle'
import StatsCard from '../components/StatsCard'
import Badge from '../components/Badge'
import LoadingSpinner from '../components/LoadingSpinner'
import { reportService, userService } from '../services/reportService'

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [recentReports, setRecentReports] = useState([])
  const [auditLogs, setAuditLogs] = useState([])
  const [mapSummary, setMapSummary] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const [statsRes, reportsRes, auditRes, mapRes] = await Promise.all([
        reportService.getAdminStats(),
        reportService.adminGetAllReports({ limit: 8 }),
        userService.getAuditLogs({ limit: 6 }),
        reportService.getMapSummary(),
      ])
      setStats(statsRes.data.stats)
      setRecentReports(reportsRes.data.reports || [])
      setAuditLogs(auditRes.data.logs || [])
      setMapSummary(mapRes?.data?.summary || null)
      setLoading(false)
    }

    load().catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <LoadingSpinner size="lg" label="Loading admin dashboard..." />
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-900 font-sans">
      <AdminSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6">
          <div>
            <h1 className="text-base font-extrabold">Admin Overview</h1>
            <p className="text-xs text-slate-500">Central moderation dashboard</p>
          </div>
          <ThemeToggle />
        </header>

        <main className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <StatsCard icon={Users} label="Users" value={stats?.totalUsers ?? 0} color="blue" />
            <StatsCard icon={FileWarning} label="Reports" value={stats?.totalReports ?? 0} color="indigo" />
            <StatsCard icon={Clock} label="Pending" value={stats?.pendingReports ?? 0} color="amber" />
            <StatsCard icon={ShieldCheck} label="ID Pending" value={stats?.pendingVerifications ?? 0} color="emerald" />
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="card p-4">
              <p className="text-sm text-slate-500">High-risk incidents</p>
              <p className="text-2xl font-bold text-red-600">{stats?.highRiskReports ?? 0}</p>
            </div>
            <div className="card p-4">
              <p className="text-sm text-slate-500">Escalated incidents</p>
              <p className="text-2xl font-bold text-amber-600">{stats?.escalatedReports ?? 0}</p>
            </div>
            <div className="card p-4">
              <p className="text-sm text-slate-500">Active live streams</p>
              <p className="text-2xl font-bold text-indigo-600">{stats?.activeStreams ?? 0}</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <div className="card p-4">
              <h2 className="font-semibold mb-3">Top Hotspot States</h2>
              <div className="space-y-2 text-sm">
                {(mapSummary?.byState || []).slice(0, 5).map((row) => (
                  <div key={row._id || 'unknown'} className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2">
                    <span className="text-slate-700 dark:text-slate-200">{row._id || 'Unknown'}</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{row.count}</span>
                  </div>
                ))}
                {(!mapSummary?.byState || mapSummary.byState.length === 0) && (
                  <p className="text-xs text-slate-500">No geospatial data yet.</p>
                )}
              </div>
            </div>

            <div className="card p-4">
              <h2 className="font-semibold mb-3">Report Status Mix</h2>
              <div className="space-y-2 text-sm">
                {(stats?.reportsByStatus || []).map((row) => {
                  const pct = Math.round(((row.count || 0) / Math.max(stats?.totalReports || 1, 1)) * 100)
                  return (
                    <div key={row._id || 'unknown'}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="capitalize text-slate-700 dark:text-slate-200">{String(row._id || 'unknown').replaceAll('_', ' ')}</span>
                        <span className="text-xs text-slate-500">{row.count} ({pct}%)</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div className="h-full bg-indigo-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h2 className="font-semibold">Latest Reports</h2>
              <Link to="/admin/reports" className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">Open queue</Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-th">Title</th>
                    <th className="table-th">Reporter</th>
                    <th className="table-th">Category</th>
                    <th className="table-th">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentReports.map((report) => (
                    <tr key={report._id}>
                      <td className="table-td">{report.title}</td>
                      <td className="table-td">{report.submittedBy?.name || 'Anonymous'}</td>
                      <td className="table-td capitalize">{report.category?.replaceAll('_', ' ')}</td>
                      <td className="table-td"><Badge status={report.status} dot /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h2 className="font-semibold">Recent Audit Trail</h2>
              <Link to="/admin/reports" className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">Open moderation queue</Link>
            </div>

            <div className="divide-y divide-slate-200 dark:divide-slate-700">
              {auditLogs.length === 0 ? (
                <p className="p-4 text-sm text-slate-500">No audit activity yet.</p>
              ) : (
                auditLogs.map((log) => (
                  <div key={log._id} className="p-4 text-sm">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{log.action}</p>
                    <p className="text-xs text-slate-500">{log.entityType} · {new Date(log.createdAt).toLocaleString()}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
