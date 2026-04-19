import api from './api';

export const authService = {
  register: (data)            => api.post('/auth/register', data),
  login:    (data)            => api.post('/auth/login', data),
  logout:   ()                => api.post('/auth/logout'),
  getMe:    ()                => api.get('/auth/me'),
  getPremiumConfig: ()        => api.get('/auth/premium-config'),
  getPremiumRequestStatus: () => api.get('/auth/premium/request-status'),
  requestPremiumUpgrade: (data = {}) => {
    const form = new FormData();

    if (data.transferReference) form.append('transferReference', data.transferReference);
    if (data.transferAmount !== undefined && data.transferAmount !== null && data.transferAmount !== '') {
      form.append('transferAmount', String(data.transferAmount));
    }
    if (data.transferDate) form.append('transferDate', data.transferDate);
    if (data.senderName) form.append('senderName', data.senderName);
    if (data.note) form.append('note', data.note);
    if (data.paymentReceipt) form.append('paymentReceipt', data.paymentReceipt);

    return api.post('/auth/premium/upgrade-request', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  updateProfile: (data)       => api.put('/auth/update-profile', data),
  changePassword: (data)      => api.put('/auth/change-password', data),
  forgotPassword: (data)      => api.post('/auth/forgot-password', data),
  resetPassword: (data)       => api.post('/auth/reset-password', data),
  uploadGovernmentId: (file, idCardNumber)  => {
    const form = new FormData();
    form.append('governmentId', file);
    form.append('idCardNumber', idCardNumber);
    return api.post('/auth/upload-id', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  uploadProfilePhoto: (file) => {
    const form = new FormData();
    form.append('profilePhoto', file);
    return api.post('/auth/upload-profile-photo', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  uploadVerificationSelfie: (file) => {
    const form = new FormData();
    form.append('selfie', file);
    return api.post('/auth/upload-selfie', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
