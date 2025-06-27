import axios from 'axios';
import { toast } from 'react-hot-toast';

// Axios instance oluştur - BACKEND PORTU 8000 OLMALI
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000', // 5000 -> 8000
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request sayacı - sonsuz döngüyü engellemek için
let activeRequests = 0;
const MAX_CONCURRENT_REQUESTS = 3;

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Çok fazla eş zamanlı istek varsa engelle
    if (activeRequests >= MAX_CONCURRENT_REQUESTS) {
      return Promise.reject(new Error('Too many concurrent requests'));
    }
    activeRequests++;

    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    activeRequests--;
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    activeRequests--;
    return response;
  },
  (error) => {
    activeRequests--;

    // Timeout hatalarını sessizce geç
    if (error.code === 'ECONNABORTED' || error.message === 'Too many concurrent requests') {
      return Promise.reject(error);
    }

    const { response } = error;

    if (response?.status === 401) {
      // Token expired or invalid
      const currentPath = window.location.pathname;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('rememberMe');

      // Sadece login sayfasında değilse yönlendir
      if (currentPath !== '/login') {
        window.location.href = '/login';
      }
    } else if (response?.status === 403) {
      toast.error('Bu işlem için yetkiniz bulunmuyor');
    } else if (response?.status === 429) {
      toast.error('Çok fazla istek gönderildi. Lütfen bekleyin.');
    } else if (response?.status >= 500) {
      toast.error('Sunucu hatası. Lütfen daha sonra tekrar deneyin.');
    } else if (error.code === 'NETWORK_ERROR') {
      // Network hatalarını sessizce logla
      console.warn('Network error:', error.message);
    }

    return Promise.reject(error);
  }
);

export default api;