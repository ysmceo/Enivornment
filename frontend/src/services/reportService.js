import api from './api';

export const reportService = {
  /** Submit a new report with optional media files */
  createReport: (formData) =>
    api.post('/reports', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  /** Paginated list of the current user's reports */
  getMyReports: (params) => api.get('/reports/my', { params }),

  /** Geospatial map report feed */
  getMapReports: (params) => api.get('/reports/map', { params }),

  /** Aggregated summary for map dashboard */
  getMapSummary: () => api.get('/reports/map-summary'),

  /** Single report detail */
  getReportById: (id) => api.get(`/reports/${id}`),

  /** Track report by generated case ID */
  trackCaseById: (caseId) => api.get(`/reports/track/${encodeURIComponent(caseId)}`),

  /** Track report by case ID + reporter email */
  trackCaseWithEmail: ({ caseId, email }) => api.post('/reports/track', { caseId, email }),

  /** Update a pending report */
  updateReport: (id, data) => api.put(`/reports/${id}`, data),

  /** Submit user experience after case completion */
  submitExperience: (id, data) => api.patch(`/reports/${id}/experience`, data),

  /** User uploads additional evidence for an existing case */
  submitAdditionalEvidence: (id, { files = [], note = '' }) => {
    const form = new FormData();
    files.forEach((file) => form.append('media', file));
    if (note) form.append('note', note);

    return api.patch(`/reports/${id}/add-evidence`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  /** Delete a pending report */
  deleteReport: (id) => api.delete(`/reports/${id}`),

  // ─── Admin ───────────────────────────────────────────────────────────────
  adminGetAllReports: (params) => api.get('/admin/reports', { params }),
  adminUpdateStatus:  (id, data) => api.patch(`/admin/reports/${id}/status`, data),
  adminRequestEvidence: (id, data) => api.patch(`/reports/${id}/request-evidence`, data),
  adminDeleteReport:  (id) => api.delete(`/admin/reports/${id}`),
  getAdminStats:      () => api.get('/admin/stats'),
};

export const userService = {
  getAllUsers:         (params) => api.get('/admin/users', { params }),
  getUserById:        (id)     => api.get(`/admin/users/${id}`),
  toggleUserStatus:   (id)     => api.patch(`/admin/users/${id}/toggle-status`),
  getGovernmentIdUrl: (id)     => api.get(`/admin/users/${id}/government-id`),
  getIdentityReviewAssets: (id) => api.get(`/admin/users/${id}/identity-assets`),
  verifyGovernmentId: (id, data) => api.patch(`/admin/users/${id}/verify-id`, data),
  getAuditLogs: (params) => api.get('/admin/audit-logs', { params }),
  getAdminNotifications: (params) => api.get('/admin/notifications', { params }),
  markAdminNotificationRead: (id) => api.patch(`/admin/notifications/${id}/read`),
  markAllAdminNotificationsRead: () => api.patch('/admin/notifications/read-all'),
  getPremiumUpgradeRequests: (params) => api.get('/admin/premium-requests', { params }),
  approvePremiumUpgradeRequest: (id, data) => api.patch(`/admin/premium-requests/${id}/approve`, data),
  rejectPremiumUpgradeRequest: (id, data) => api.patch(`/admin/premium-requests/${id}/reject`, data),
};

export const streamService = {
  getActiveStreams: (params) => api.get('/streams', { params }),
  getMyStreams:     () => api.get('/streams/my'),
  getStreamById:   (id, params)   => api.get(`/streams/${id}`, { params }),
  startStream:     (data) => api.post('/streams', data),
  endStream:       (id)   => api.patch(`/streams/${id}/end`),
};
