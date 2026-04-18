import { format, formatDistanceToNow } from 'date-fns';
import { MapPin, Calendar, Tag, Eye, Trash2, Edit } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { Link } from 'react-router-dom';

/**
 * ReportCard
 * Displays a summary card for a single crime report.
 *
 * @param {object}   report    - The report object from the API.
 * @param {Function} onDelete  - Called when the delete button is clicked.
 * @param {boolean}  adminView - Show extra admin controls when true.
 */
export default function ReportCard({ report, onDelete, adminView = false }) {
  const firstImage = report.media?.find((m) => m.resourceType === 'image');
  const mediaCount = report.media?.length || 0;

  return (
    <div className="card hover:shadow-md transition-all duration-200 overflow-hidden">
      {/* Thumbnail */}
      <div className="relative h-36 bg-slate-100 dark:bg-slate-700 overflow-hidden">
        {firstImage ? (
          <img
            src={firstImage.url}
            alt="Evidence"
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm">
            No image
          </div>
        )}

        {/* Category pill */}
        <span className="absolute top-2 left-2 bg-black/60 text-white text-[11px] font-medium px-2 py-0.5 rounded-full capitalize">
          {report.category?.replace(/_/g, ' ')}
        </span>

        {/* Status badge */}
        <div className="absolute top-2 right-2">
          <StatusBadge status={report.status} />
        </div>

        {/* Media count */}
        {mediaCount > 0 && (
          <span className="absolute bottom-2 right-2 bg-black/60 text-white text-[11px] px-2 py-0.5 rounded-full">
            {mediaCount} file{mediaCount !== 1 && 's'}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-slate-900 dark:text-white line-clamp-1 mb-1">
          {report.title}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">
          {report.description}
        </p>

        {/* Meta row */}
        <div className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400 mb-4">
          <span className="flex items-center gap-1 line-clamp-1">
            <MapPin className="w-3 h-3 shrink-0" />
            {report.location?.address || '—'}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3 shrink-0" />
            {report.incidentDate
              ? format(new Date(report.incidentDate), 'dd MMM yyyy')
              : '—'}
            <span className="ml-auto">
              {formatDistanceToNow(new Date(report.createdAt), { addSuffix: true })}
            </span>
          </span>
          {adminView && report.submittedBy && (
            <span className="flex items-center gap-1">
              <Tag className="w-3 h-3 shrink-0" />
              {report.submittedBy.name || report.submittedBy.email || '—'}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Link
            to={adminView ? `/admin/reports/${report._id}` : `/my-reports/${report._id}`}
            className="btn-primary py-1.5 px-3 text-xs flex-1"
          >
            <Eye className="w-3 h-3" /> View
          </Link>

          {/* Only show delete for pending user reports */}
          {!adminView && report.status === 'pending' && onDelete && (
            <button
              onClick={() => onDelete(report._id)}
              className="btn-danger py-1.5 px-3 text-xs"
              title="Delete report"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
