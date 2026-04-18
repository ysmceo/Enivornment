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

  /** Update a pending report */
  updateReport: (id, data) => api.put(`/reports/${id}`, data),

  /** Delete a pending report */
  deleteReport: (id) => api.delete(`/reports/${id}`),

  // ─── Admin ───────────────────────────────────────────────────────────────
  adminGetAllReports: (params) => api.get('/admin/reports', { params }),
  adminUpdateStatus:  (id, data) => api.patch(`/admin/reports/${id}/status`, data),
  adminDeleteReport:  (id) => api.delete(`/admin/reports/${id}`),
  getAdminStats:      () => api.get('/admin/stats'),
};

export const userService = {
  getAllUsers:         (params) => api.get('/admin/users', { params }),
  getUserById:        (id)     => api.get(`/admin/users/${id}`),
  toggleUserStatus:   (id)     => api.patch(`/admin/users/${id}/toggle-status`),
  getGovernmentIdUrl: (id)     => api.get(`/admin/users/${id}/government-id`),
  verifyGovernmentId: (id, data) => api.patch(`/admin/users/${id}/verify-id`, data),
  getAuditLogs: (params) => api.get('/admin/audit-logs', { params }),
};

export const streamService = {
  getActiveStreams: () => api.get('/streams'),
  getMyStreams:     () => api.get('/streams/my'),
  getStreamById:   (id)   => api.get(`/streams/${id}`),
  startStream:     (data) => api.post('/streams', data),
  endStream:       (id)   => api.patch(`/streams/${id}/end`),
};
