import { api } from './axios';

/** Unwrap Laravel envelope: { success, data, message } → data */
const unwrap = (response) => response.data.data ?? response.data;

export const adminApi = {
  getAdminMetrics() {
    return api.get('/admin/stats').then(unwrap);
  },

  getUsers(params = {}) {
    return api.get('/admin/users', { params }).then(unwrap);
  },

  getUserById(id) {
    return api.get(`/admin/users/${encodeURIComponent(id)}`).then(unwrap);
  },

  toggleUserBan(id) {
    return api.patch(`/admin/users/${encodeURIComponent(id)}/ban`).then(unwrap);
  },

  getAdminJobs(params = {}) {
    return api.get('/admin/jobs', { params }).then(unwrap);
  },

  forceDeleteJob(id) {
    return api.delete(`/admin/jobs/${encodeURIComponent(id)}`).then(unwrap);
  },

  verifyUser: (id) =>
    api.patch(`/admin/users/${encodeURIComponent(id)}/verify`).then(unwrap),

  verifyPassword(password) {
    return api.post('/admin/verify-password', { password }).then(unwrap);
  },

  updateSettings(payload) {
    return api.put('/admin/settings', payload).then(unwrap);
  },

  updateContactInfo(payload) {
    return api.put('/admin/contact-info', payload).then(unwrap);
  },
};
