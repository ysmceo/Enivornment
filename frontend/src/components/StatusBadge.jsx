/**
 * StatusBadge
 * Displays a colour-coded pill for report/verification status values.
 */
const STATUS_STYLES = {
  // Report statuses
  pending:         'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  under_review:    'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  investigating:   'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  resolved:        'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  rejected:        'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  closed:          'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',

  // ID verification statuses
  none:     'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  verified: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',

  // Priority
  low:      'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  medium:   'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  high:     'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  critical: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',

  // Stream
  active: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  ended:  'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
};

const STATUS_LABELS = {
  under_review:  'Under Review',
  domestic_violence: 'Domestic Violence',
  drug_activity: 'Drug Activity',
  suspicious_activity: 'Suspicious Activity',
  traffic_incident: 'Traffic Incident',
};

export default function StatusBadge({ status, className = '' }) {
  const styles = STATUS_STYLES[status] || STATUS_STYLES.closed;
  const label  = STATUS_LABELS[status] || (status ? status.replace(/_/g, ' ') : '—');

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${styles} ${className}`}
    >
      {label}
    </span>
  );
}
