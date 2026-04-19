import api from './api';

const toUploadFile = (file, fallbackName = 'evidence.jpg') => {
  if (!file) return null;
  const uri = file.uri || file.fileCopyUri;
  if (!uri) return null;

  const providedName = file.name || uri.split('/').pop();
  const name = providedName || fallbackName;

  let type = file.mimeType || file.type;
  if (!type) {
    const lower = String(name || '').toLowerCase();
    if (lower.endsWith('.mp4')) type = 'video/mp4';
    else if (lower.endsWith('.webm')) type = 'video/webm';
    else if (lower.endsWith('.mov')) type = 'video/quicktime';
    else if (lower.endsWith('.pdf')) type = 'application/pdf';
    else if (lower.endsWith('.png')) type = 'image/png';
    else if (lower.endsWith('.webp')) type = 'image/webp';
    else type = 'image/jpeg';
  }

  return { uri, name, type };
};

export const reportService = {
  getMyReports: (params = {}) => api.get('/reports/my', { params }),

  trackCaseWithEmail: ({ caseId, email }) => api.post('/reports/track', { caseId, email }),

  createReport: ({
    title,
    description,
    incidentDate,
    category,
    severity,
    state,
    address,
    lat,
    lng,
    reporterFullName,
    reporterPhone,
    reporterEmail,
    evidenceFiles = [],
  }) => {
    const form = new FormData();

    form.append('title', String(title || '').trim());
    form.append('description', String(description || '').trim());
    form.append('incidentDate', new Date(incidentDate || Date.now()).toISOString());
    form.append('category', String(category || 'other').trim());
    form.append('severity', String(severity || 'medium').trim());
    form.append('state', String(state || 'FCT').trim());

    form.append('location.address', String(address || '').trim());
    form.append('location.coordinates.lat', String(lat || 0));
    form.append('location.coordinates.lng', String(lng || 0));

    if (reporterFullName) form.append('reporter.fullName', String(reporterFullName).trim());
    if (reporterPhone) form.append('reporter.phone', String(reporterPhone).trim());
    if (reporterEmail) form.append('reporter.email', String(reporterEmail).trim().toLowerCase());

    evidenceFiles.forEach((file, index) => {
      const uploadFile = toUploadFile(file, `evidence-${index + 1}.jpg`);
      if (uploadFile) form.append('media', uploadFile);
    });

    return api.post('/reports', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
