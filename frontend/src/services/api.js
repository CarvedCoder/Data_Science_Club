import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const auth = {
  login: (email, password) => {
    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);
    return api.post('/auth/login', formData);
  },
  signup: (data) => api.post('/auth/signup', data),
  getMe: () => api.get('/auth/me'),
};

export const events = {
  getAll: () => api.get('/events/'),
  getOne: (id) => api.get(`/events/${id}`),
  create: (data) => api.post('/events/', data),
  update: (id, data) => api.put(`/events/${id}`, data),
  delete: (id) => api.delete(`/events/${id}`),
};

export const attendance = {
  startSession: (eventId) => api.post('/attendance/start-session', { event_id: eventId }),
  stopSession: (sessionId) => api.post(`/attendance/stop-session/${sessionId}`),
  getActiveSession: () => api.get('/attendance/active-session'),
  mark: (token) => api.post('/attendance/mark', { token }),
  getMyAttendance: () => api.get('/attendance/my-attendance'),
  getEventAttendance: (eventId) => api.get(`/attendance/event/${eventId}`),
  getStats: () => api.get('/attendance/stats'),
};

export const admin = {
  getPendingUsers: () => api.get('/admin/pending-users'),
  approveUser: (userId, approve) => api.post('/admin/approve-user', { user_id: userId, approve }),
  getMembers: () => api.get('/admin/members'),
  toggleMember: (userId) => api.post(`/admin/toggle-member/${userId}`),
  removeMember: (userId) => api.delete(`/admin/remove-member/${userId}`),
  getStats: () => api.get('/admin/stats'),
};

export const resources = {
  getAll: (eventId) => api.get('/resources/', { params: { event_id: eventId } }),
  upload: (formData) => api.post('/resources/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  delete: (id) => api.delete(`/resources/${id}`),
};

export default api;