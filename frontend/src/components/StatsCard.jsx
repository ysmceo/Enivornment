import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

export default function StatsCard({ icon: Icon, label, value, trend, trendLabel, color = 'indigo' }) {
  const colorMap = {
    indigo: {
      iconBg: 'bg-indigo-50 dark:bg-indigo-900/30',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      bar: 'bg-indigo-500',
    },
    amber: {
      iconBg: 'bg-amber-50 dark:bg-amber-900/30',
      iconColor: 'text-amber-600 dark:text-amber-400',
      bar: 'bg-amber-500',
    },
    emerald: {
      iconBg: 'bg-emerald-50 dark:bg-emerald-900/30',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      bar: 'bg-emerald-500',
    },
    red: {
      iconBg: 'bg-red-50 dark:bg-red-900/30',
      iconColor: 'text-red-600 dark:text-red-400',
      bar: 'bg-red-500',
    },
    blue: {
      iconBg: 'bg-blue-50 dark:bg-blue-900/30',
      iconColor: 'text-blue-600 dark:text-blue-400',
      bar: 'bg-blue-500',
    },
  }

  const c = colorMap[color] ?? colorMap.indigo

  const TrendIcon =
    trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus
  const trendColor =
    trend > 0 ? 'text-emerald-600 dark:text-emerald-400' : trend < 0 ? 'text-red-500 dark:text-red-400' : 'text-slate-400'

  return (
    <div className="card p-5 flex flex-col gap-4 hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${c.iconBg}`}>
          {Icon && <Icon className={`w-5 h-5 ${c.iconColor}`} />}
        </div>
        {trend !== undefined && (
          <span className={`inline-flex items-center gap-1 text-xs font-medium ${trendColor}`}>
            <TrendIcon className="w-3.5 h-3.5" />
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div>
        <div className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{value}</div>
        <div className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{label}</div>
        {trendLabel && <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">{trendLabel}</div>}
      </div>
      <div className="h-1 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${c.bar}`} style={{ width: `${Math.min(100, Math.abs(trend ?? 60))}%` }} />
      </div>
    </div>
  )
}
