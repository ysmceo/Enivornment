const STATUS_STYLES = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800/50',
  'under review': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800/50',
  approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800/50',
  resolved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50',
  verified: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50',
  unverified: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800/50',
  suspended: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800/50',
  active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50',
  admin: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/50',
  citizen: 'bg-slate-100 text-slate-700 dark:bg-slate-700/50 dark:text-slate-300 border-slate-200 dark:border-slate-600',
  configured: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50',
  unconfigured: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800/50',
  degraded: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800/50',
  fallback: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800/50',
}

const DOT_STYLES = {
  pending: 'bg-amber-500',
  'under review': 'bg-blue-500',
  approved: 'bg-emerald-500',
  rejected: 'bg-red-500',
  resolved: 'bg-emerald-500',
  verified: 'bg-emerald-500',
  unverified: 'bg-amber-500',
  suspended: 'bg-red-500',
  active: 'bg-emerald-500',
  configured: 'bg-emerald-500',
  unconfigured: 'bg-red-500',
  degraded: 'bg-amber-500',
  fallback: 'bg-blue-500',
}

export default function Badge({ status, label, dot = false, size = 'sm' }) {
  const key = status?.toLowerCase() ?? ''
  const style = STATUS_STYLES[key] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600'
  const dotColor = DOT_STYLES[key] ?? 'bg-slate-400'

  const sizeClass = size === 'xs' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1'

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium rounded-full border capitalize ${style} ${sizeClass}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />}
      {label || status}
    </span>
  )
}
