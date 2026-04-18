import api from './api'

export const platformService = {
  getMetadata: () => api.get('/meta/metadata'),
  getConfigHealth: () => api.get('/meta/config-health'),
  getEmergencyContacts: (params) => api.get('/emergency-contacts', { params }),
  getEmergencyContactsByState: (state, params = {}) => api.get(`/emergency-contacts/state/${encodeURIComponent(state)}`, { params }),
  getNearbyEmergencyContacts: (params) => api.get('/emergency-contacts/nearby', { params }),
  adminListEmergencyContacts: (params) => api.get('/emergency-contacts/admin/all', { params }),
  getAdminEmergencyContacts: (params) => api.get('/emergency-contacts/admin/all', { params }),
  exportEmergencyContactsCsv: (params) => api.get('/emergency-contacts/admin/export-csv', { params, responseType: 'blob' }),
  importEmergencyContactsCsv: (payload) => api.post('/emergency-contacts/admin/import-csv', payload),
  createEmergencyContact: (data) => api.post('/emergency-contacts', data),
  updateEmergencyContact: (id, data) => api.put(`/emergency-contacts/${id}`, data),
  deleteEmergencyContact: (id) => api.delete(`/emergency-contacts/${id}`),
  getAuditLogs: (params) => api.get('/admin/audit-logs', { params }),
}
