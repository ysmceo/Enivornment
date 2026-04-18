import api from './api';

export const authService = {
  register: (data)            => api.post('/auth/register', data),
  login:    (data)            => api.post('/auth/login', data),
  logout:   ()                => api.post('/auth/logout'),
  getMe:    ()                => api.get('/auth/me'),
  updateProfile: (data)       => api.put('/auth/update-profile', data),
  changePassword: (data)      => api.put('/auth/change-password', data),
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
