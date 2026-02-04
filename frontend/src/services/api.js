import axios from 'axios';

// Use environment variable for production, fallback to /api for local dev with Vite proxy
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Token refresh logic
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and we haven't tried refreshing yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue this request until refresh is done
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers['Authorization'] = `Bearer ${token}`;
          return api(originalRequest);
        }).catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');
      
      if (!refreshToken) {
        // No refresh token, clear everything and redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken
        });
        
        const { access_token, refresh_token } = response.data;
        
        localStorage.setItem('token', access_token);
        localStorage.setItem('refreshToken', refresh_token);
        
        api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
        originalRequest.headers['Authorization'] = `Bearer ${access_token}`;
        
        processQueue(null, access_token);
        
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export const auth = {
  login: (email, password) => {
    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);
    return api.post('/auth/login', formData);
  },
  signup: (data) => api.post('/auth/signup', {
    email: data.email,
    password: data.password,
    full_name: data.full_name || data.name  // Support both old and new field names
  }),
  refresh: (refreshToken) => api.post('/auth/refresh', { refresh_token: refreshToken }),
  getMe: () => api.get('/auth/me'),
};

export const events = {
  getAll: () => api.get('/events/'),
  getOne: (id) => api.get(`/events/${id}`),
  create: (data) => api.post('/events/', {
    title: data.title,
    description: data.description,
    scheduled_at: data.scheduled_at || data.date,  // Support both old and new field names
    notes: data.notes || ''
  }),
  update: (id, data) => api.put(`/events/${id}`, data),
  delete: (id) => api.delete(`/events/${id}`),
  markComplete: (id) => api.put(`/events/${id}`, { status: 'completed' }),
  markScheduled: (id) => api.put(`/events/${id}`, { status: 'scheduled' }),
};

export const attendance = {
  // Admin QR management
  startSession: (eventId) => api.post('/attendance/start-session', { event_id: String(eventId) }),
  stopSession: (sessionId) => api.post(`/attendance/stop-session/${sessionId}`),
  refreshQR: (sessionId) => api.post(`/attendance/refresh-qr/${sessionId}`),
  getActiveSession: () => api.get('/attendance/active-session'),
  
  // Student attendance marking - now uses qr_payload instead of token
  mark: (qrPayload) => api.post('/attendance/mark', { qr_payload: qrPayload }),
  
  // Attendance records
  getMyAttendance: () => api.get('/attendance/my-attendance'),
  getEventAttendance: (eventId) => api.get(`/attendance/event/${eventId}`),
  getStats: () => api.get('/attendance/stats'),
};

export const admin = {
  // New approval workflow endpoints
  getApprovalRequests: (status = 'PENDING', page = 1, limit = 20) => 
    api.get('/admin/approval-requests', { params: { status_filter: status, page, limit } }),
  
  decideApproval: (requestId, decision, approvedRole = 'student', rejectionReason = null) =>
    api.post(`/admin/approval-requests/${requestId}/decide`, {
      decision,  // 'approved' or 'rejected'
      approved_role: approvedRole,
      rejection_reason: rejectionReason
    }),
  
  // Legacy endpoints (mapped to new structure)
  getPendingUsers: () => api.get('/admin/approval-requests', { params: { status_filter: 'PENDING' } }),
  approveUser: (requestId, approve, role = 'student') => 
    api.post(`/admin/approval-requests/${requestId}/decide`, {
      decision: approve ? 'approved' : 'rejected',
      approved_role: role
    }),
  
  // Member management
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

// Member profile and dashboard APIs
export const member = {
  // Profile management
  getProfile: () => api.get('/member/profile'),
  updateProfile: (data) => api.put('/member/profile', data),
  
  // Member's events and calendar
  getMyEvents: () => api.get('/member/events'),
  getUpcomingEvents: () => api.get('/member/events/upcoming'),
  getEventHistory: () => api.get('/member/events/history'),
  
  // Activity and stats
  getActivityHistory: () => api.get('/member/activity'),
  getBadges: () => api.get('/member/badges'),
};

export default api;