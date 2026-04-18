export default function LoadingSpinner({ size = 'md', label }) {
  const sizeClass = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' }[size]

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <svg
        className={`${sizeClass} animate-spin text-indigo-600 dark:text-indigo-400`}
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
      {label && <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>}
    </div>
  )
}

export function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
      <LoadingSpinner size="lg" label="Loading…" />
    </div>
  )
}

export function TableLoader({ cols = 5, rows = 5 }) {
  return (
    <tbody>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="border-t border-slate-100 dark:border-slate-700">
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} className="px-4 py-3.5">
              <div className={`h-4 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse ${c === 0 ? 'w-8 h-8 rounded-full' : 'w-full'}`} />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  )
}
