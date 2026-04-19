import api from './api';

const toUploadFile = (file, fallbackName) => {
  if (!file) return null;

  const uri = file.uri || file.fileCopyUri;
  if (!uri) return null;

  const providedName = file.name || uri.split('/').pop();
  const name = providedName || fallbackName;

  let type = file.mimeType || file.type;
  if (!type) {
    const lower = String(name || '').toLowerCase();
    if (lower.endsWith('.pdf')) type = 'application/pdf';
    else if (lower.endsWith('.png')) type = 'image/png';
    else if (lower.endsWith('.webp')) type = 'image/webp';
    else type = 'image/jpeg';
  }

  return { uri, name, type };
};

export const authService = {
  getMe: () => api.get('/auth/me'),
  getPremiumRequestStatus: () => api.get('/auth/premium/request-status'),
  requestPremiumUpgrade: ({
    transferReference,
    transferAmount,
    transferDate,
    senderName,
    note,
    paymentReceipt,
  } = {}) => {
    const form = new FormData();

    if (transferReference) form.append('transferReference', String(transferReference).trim());
    if (transferAmount !== undefined && transferAmount !== null && transferAmount !== '') {
      form.append('transferAmount', String(transferAmount));
    }
    if (transferDate) form.append('transferDate', String(transferDate).trim());
    if (senderName) form.append('senderName', String(senderName).trim());
    if (note) form.append('note', String(note).trim());

    const uploadFile = toUploadFile(paymentReceipt, 'premium-receipt.jpg');
    if (uploadFile) form.append('paymentReceipt', uploadFile);

    return api.post('/auth/premium/upgrade-request', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  uploadGovernmentId: (file, idCardNumber) => {
    const form = new FormData();
    const uploadFile = toUploadFile(file, 'government-id.jpg');
    if (uploadFile) form.append('governmentId', uploadFile);
    form.append('idCardNumber', String(idCardNumber || '').trim());

    return api.post('/auth/upload-id', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  uploadVerificationSelfie: (file) => {
    const form = new FormData();
    const uploadFile = toUploadFile(file, 'verification-selfie.jpg');
    if (uploadFile) form.append('selfie', uploadFile);

    return api.post('/auth/upload-selfie', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
