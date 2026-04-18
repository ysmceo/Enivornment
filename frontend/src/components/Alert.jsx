import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react'

const VARIANTS = {
  success: {
    icon: CheckCircle,
    wrapper: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800',
    icon_color: 'text-emerald-600 dark:text-emerald-400',
    text: 'text-emerald-800 dark:text-emerald-300',
  },
  error: {
    icon: XCircle,
    wrapper: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    icon_color: 'text-red-600 dark:text-red-400',
    text: 'text-red-800 dark:text-red-300',
  },
  warning: {
    icon: AlertCircle,
    wrapper: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
    icon_color: 'text-amber-600 dark:text-amber-400',
    text: 'text-amber-800 dark:text-amber-300',
  },
  info: {
    icon: Info,
    wrapper: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    icon_color: 'text-blue-600 dark:text-blue-400',
    text: 'text-blue-800 dark:text-blue-300',
  },
}

export default function Alert({ type = 'info', title, message, onClose }) {
  const v = VARIANTS[type]
  const Icon = v.icon

  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border ${v.wrapper} animate-slide-up`}>
      <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${v.icon_color}`} />
      <div className="flex-1 min-w-0">
        {title && <p className={`text-sm font-semibold ${v.text}`}>{title}</p>}
        {message && <p className={`text-sm mt-0.5 ${v.text} opacity-90`}>{message}</p>}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className={`shrink-0 p-0.5 rounded-lg opacity-60 hover:opacity-100 transition-opacity ${v.icon_color}`}
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
