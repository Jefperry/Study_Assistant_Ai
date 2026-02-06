/**
 * API Service
 * 
 * Centralized API client with authentication interceptors.
 */

import axios from 'axios';

// Backend URL from environment or default
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
const API_VERSION = '/api/v1';

// Create axios instance
const api = axios.create({
  baseURL: `${BACKEND_URL}${API_VERSION}`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
});

// Token management
export const getToken = () => localStorage.getItem('access_token');
export const getRefreshToken = () => localStorage.getItem('refresh_token');
export const setTokens = (accessToken, refreshToken) => {
  localStorage.setItem('access_token', accessToken);
  localStorage.setItem('refresh_token', refreshToken);
};
export const clearTokens = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
};
export const isAuthenticated = () => !!getToken();

// Request interceptor - add auth token
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If 401 and not already retrying, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        try {
          const response = await axios.post(
            `${BACKEND_URL}${API_VERSION}/auth/refresh`,
            { refresh_token: refreshToken }
          );
          
          const { access_token, refresh_token } = response.data;
          setTokens(access_token, refresh_token);
          
          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh failed, logout user
          clearTokens();
          window.location.href = '/auth';
          return Promise.reject(refreshError);
        }
      }
    }
    
    return Promise.reject(error);
  }
);

// ===========================================
// Auth API
// ===========================================
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  refresh: (refreshToken) => api.post('/auth/refresh', { refresh_token: refreshToken }),
  getMe: () => api.get('/auth/me'),
  updateMe: (data) => api.patch('/auth/me', data),
  changePassword: (data) => api.post('/auth/change-password', data),
  logout: () => api.post('/auth/logout'),
};

// ===========================================
// Papers API
// ===========================================
export const papersAPI = {
  upload: (file, title, tags) => {
    const formData = new FormData();
    formData.append('file', file);
    if (title) formData.append('title', title);
    if (tags) formData.append('tags', tags);
    
    return api.post('/papers/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000, // 2 minutes for uploads
    });
  },
  
  list: (page = 1, pageSize = 20, status = null) => {
    const params = { page, page_size: pageSize };
    if (status) params.status = status;
    return api.get('/papers', { params });
  },
  
  get: (paperId) => api.get(`/papers/${paperId}`),
  
  getContent: (paperId) => api.get(`/papers/${paperId}/content`),
  
  update: (paperId, data) => api.patch(`/papers/${paperId}`, data),
  
  delete: (paperId) => api.delete(`/papers/${paperId}`),
  
  getJob: (paperId) => api.get(`/papers/${paperId}/job`),
};

// ===========================================
// Summaries API
// ===========================================
export const summariesAPI = {
  generate: (paperId, summaryType = 'comprehensive', useGroq = true) => 
    api.post('/summaries/generate', {
      paper_id: paperId,
      summary_type: summaryType,
      use_groq: useGroq,
    }),
  
  getForPaper: (paperId) => api.get(`/summaries/${paperId}`),
  
  get: (summaryId) => api.get(`/summaries/detail/${summaryId}`),
  
  delete: (summaryId) => api.delete(`/summaries/${summaryId}`),
  
  getFlashcards: (summaryId) => api.get(`/summaries/${summaryId}/flashcards`),
};

// ===========================================
// Search API
// ===========================================
export const searchAPI = {
  semantic: (query, limit = 10, minScore = 0.3) => 
    api.post('/search', { query, limit, min_score: minScore }, { timeout: 60000 }), // 60s for ML model loading
  
  history: (limit = 20) => api.get('/search/history', { params: { limit } }),
};

// ===========================================
// AI API (direct text summarization)
// ===========================================
export const aiAPI = {
  summarize: (text, title = '', generateFlashcards = true) =>
    api.post('/ai/summarize', {
      text,
      title,
      generate_flashcards: generateFlashcards,
    }),
  
  summarizePaper: (paperId, summaryType = 'brief') =>
    api.post('/summaries', {
      paper_id: paperId,
      summary_type: summaryType,
    }),
};

// Also add list to summariesAPI
summariesAPI.list = (page = 1, pageSize = 20) => {
  const params = { page, page_size: pageSize };
  return api.get('/summaries', { params });
};

// Add ArXiv upload to papersAPI
papersAPI.uploadArxiv = (arxivUrl) => 
  api.post('/papers/arxiv', { url: arxivUrl });

export default api;
