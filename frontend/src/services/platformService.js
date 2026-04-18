import api from './api'

export const platformService = {
  getMetadata: () => api.get('/meta/metadata'),
  getEmergencyContacts: (params) => api.get('/emergency-contacts', { params }),
  createEmergencyContact: (data) => api.post('/emergency-contacts', data),
  updateEmergencyContact: (id, data) => api.put(`/emergency-contacts/${id}`, data),
  deleteEmergencyContact: (id) => api.delete(`/emergency-contacts/${id}`),
  getAuditLogs: (params) => api.get('/admin/audit-logs', { params }),
}
