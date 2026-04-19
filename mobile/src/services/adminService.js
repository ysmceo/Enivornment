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

  getPremiumUpgradeRequests: (params = {}) => api.get('/admin/premium-requests', { params }),

  approvePremiumUpgradeRequest: ({ requestId, adminNote = '' }) =>
    api.patch(`/admin/premium-requests/${requestId}/approve`, {
      ...(adminNote ? { adminNote } : {}),
    }),

  rejectPremiumUpgradeRequest: ({ requestId, reason = '' }) =>
    api.patch(`/admin/premium-requests/${requestId}/reject`, {
      ...(reason ? { reason } : {}),
    }),

  getMetadata: () => api.get('/meta/metadata'),

  getEmergencyContacts: (params = {}) => api.get('/emergency-contacts/admin/all', { params }),

  exportEmergencyContactsCsv: (params = {}) =>
    api.get('/emergency-contacts/admin/export-csv', {
      params,
      responseType: 'text',
      headers: { Accept: 'text/csv' },
    }),

  importEmergencyContactsCsv: (payload) => api.post('/emergency-contacts/admin/import-csv', payload),

  createEmergencyContact: (payload) => api.post('/emergency-contacts', payload),

  updateEmergencyContact: ({ contactId, payload }) => api.put(`/emergency-contacts/${contactId}`, payload),

  deleteEmergencyContact: (contactId) => api.delete(`/emergency-contacts/${contactId}`),
};
