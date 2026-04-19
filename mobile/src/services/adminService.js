import api from './api';

export const adminService = {
  getReports: (params = {}) => api.get('/admin/reports', { params }),

  getUsers: (params = {}) => api.get('/admin/users', { params }),

  updateReportStatus: ({ reportId, status, adminNotes = '', rejectionReason = '', priority }) =>
    api.patch(`/admin/reports/${reportId}/status`, {
      status,
      adminNotes,
      rejectionReason,
      ...(priority ? { priority } : {}),
    }),

  deleteReport: (reportId) => api.delete(`/admin/reports/${reportId}`),

  toggleUserStatus: (userId) => api.patch(`/admin/users/${userId}/toggle-status`),

  reviewGovernmentId: ({ userId, action, rejectionReason }) =>
    api.patch(`/admin/users/${userId}/verify-id`, {
      action,
      ...(action === 'reject' ? { rejectionReason: rejectionReason || 'Rejected via mobile admin app' } : {}),
    }),
};
