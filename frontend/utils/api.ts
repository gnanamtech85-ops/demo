import axios, { AxiosResponse } from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      if (typeof window !== 'undefined') {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    } else if (error.response?.status >= 500) {
      toast.error('Server error. Please try again later.');
    } else if (error.response?.status === 403) {
      toast.error('Access denied');
    }
    
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials: { username: string; password: string }) =>
    api.post('/auth/login', credentials),
  
  register: (userData: { 
    username: string; 
    email: string; 
    password: string; 
    role?: string 
  }) => api.post('/auth/register', userData),
  
  getProfile: () => api.get('/auth/profile'),
  
  updateProfile: (data: { username?: string; email?: string }) =>
    api.put('/auth/profile', data),
  
  getGoogleAuthUrl: () => api.post('/auth/google/auth-url'),
  
  handleGoogleCallback: (data: { code: string; token: string }) =>
    api.post('/auth/google/callback', data),
  
  refreshGoogleToken: () => api.post('/auth/google/refresh'),
};

// Shared Drives API
export const drivesAPI = {
  createDrive: (driveData: {
    driveLink: string;
    title: string;
    description?: string;
    allowedClients?: string[];
  }) => api.post('/drives/create', driveData),
  
  getDrives: (params?: { page?: number; limit?: number; status?: string }) =>
    api.get('/drives', { params }),
  
  getDrive: (driveId: string) => api.get(`/drives/${driveId}`),
  
  updateDrive: (driveId: string, data: {
    title?: string;
    description?: string;
    status?: string;
    allowedClients?: string[];
  }) => api.put(`/drives/${driveId}`, data),
  
  deleteDrive: (driveId: string) => api.delete(`/drives/${driveId}`),
  
  getClientDrives: () => api.get('/drives/client/drives'),
};

// Photos API
export const photosAPI = {
  getPhotos: (driveId: string, params?: {
    page?: number;
    limit?: number;
    sortBy?: string;
  }) => api.get(`/photos/shared-drive/${driveId}`, { params }),
  
  selectPhoto: (photoId: string, select: boolean = true) =>
    api.post(`/photos/${photoId}/select`, { select }),
  
  likePhoto: (photoId: string, like: boolean = true) =>
    api.post(`/photos/${photoId}/like`, { like }),
  
  bulkAction: (data: {
    photoIds: string[];
    action: 'select' | 'unselect' | 'like' | 'unlike';
  }) => api.post('/photos/bulk/select', data),
  
  downloadSelected: (photoIds: string[]) =>
    api.post('/photos/download/selected', { photoIds }, { responseType: 'blob' }),
  
  getMySelections: (params?: { page?: number; limit?: number }) =>
    api.get('/photos/my-selections', { params }),
  
  getStats: (driveId: string) => api.get(`/photos/stats/${driveId}`),
};

// Utility functions
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const extractDriveFolderId = (driveLink: string): string | null => {
  const patterns = [
    /\/folders\/([a-zA-Z0-9-_]+)/,
    /id=([a-zA-Z0-9-_]+)/,
    /\/drive\/folders\/([a-zA-Z0-9-_]+)/
  ];

  for (const pattern of patterns) {
    const match = driveLink.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return null;
};

export const validateDriveLink = (link: string): boolean => {
  return extractDriveFolderId(link) !== null;
};

export default api;