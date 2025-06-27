import axios from 'axios';
import { toast } from 'react-hot-toast';

// Axios instance oluştur - BACKEND PORTU 8000 (Backend'e uygun)
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  timeout: 30000, // NAT operations için artırıldı
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    'Accept': 'application/json'
  },
});

// Request sayacı - sonsuz döngüyü engellemek için
let activeRequests = 0;
const MAX_CONCURRENT_REQUESTS = 10; // NAT operations için artırıldı

// Token expiry check utility - Backend JWT yapısına uygun
const isTokenExpired = () => {
  const tokenExpiry = localStorage.getItem('tokenExpiry');
  if (!tokenExpiry) return true;
  const expiryTime = parseInt(tokenExpiry);
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000; // 5 minutes buffer
  return now >= (expiryTime - fiveMinutes);
};

// Auth data clear utility - Enhanced
const clearAuthData = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('tokenExpiry');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('userRole'); // Backend'deki role sistemi için
  localStorage.removeItem('userPermissions'); // Backend'deki permission sistemi için
};

// Redirect to login utility - Enhanced
const redirectToLogin = (message = 'Oturum süreniz doldu. Lütfen tekrar giriş yapın.') => {
  const currentPath = window.location.pathname;
  if (currentPath !== '/login' && currentPath !== '/') {
    clearAuthData();
    toast.error(message);
    setTimeout(() => {
      window.location.href = '/login';
    }, 1000);
  }
};

// Request interceptor - Backend'e uygun
api.interceptors.request.use(
  (config) => {
    // Debug mode logging
    if (import.meta.env.VITE_DEBUG === 'true') {
      console.log(`📤 [AXIOS] ${config.method?.toUpperCase()} ${config.url}`);
      console.log(`📤 [AXIOS] Headers:`, config.headers);
      if (config.data) {
        console.log(`📤 [AXIOS] Data:`, config.data);
      }
    }

    // Çok fazla eş zamanlı istek varsa engelle
    if (activeRequests >= MAX_CONCURRENT_REQUESTS) {
      console.warn('⚠️ [AXIOS] Too many concurrent requests, rejecting');
      return Promise.reject(new Error('Too many concurrent requests'));
    }

    activeRequests++;

    // Token kontrolü
    const token = localStorage.getItem('token');

    // Token expiry check
    if (token && isTokenExpired()) {
      console.log('⏰ [AXIOS] Token expired, clearing auth data');
      clearAuthData();
      redirectToLogin();
      return Promise.reject(new Error('Token expired'));
    }

    // Token varsa header'a ekle - Backend JWT formatına uygun
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Backend'deki enhanced headers support
    config.headers['X-Request-Time'] = Date.now().toString();
    config.headers['X-Client-Version'] = '2.0.0'; // NAT module versiyonu
    config.headers['X-Client-Type'] = 'kobi-firewall-frontend';

    // NAT operations için özel timeout
    if (config.url?.includes('/nat/')) {
      config.timeout = 45000; // NAT işlemleri daha uzun sürebilir
    }

    // PC-to-PC sharing için özel timeout
    if (config.url?.includes('/setup-pc-sharing')) {
      config.timeout = 60000; // PC-to-PC kurulum uzun sürebilir
    }

    return config;
  },
  (error) => {
    activeRequests = Math.max(0, activeRequests - 1);
    console.error('❌ [AXIOS] Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - Backend response'larına uygun
api.interceptors.response.use(
  (response) => {
    activeRequests = Math.max(0, activeRequests - 1);

    // Debug mode logging
    if (import.meta.env.VITE_DEBUG === 'true') {
      console.log(`📥 [AXIOS] ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`);
      console.log(`📥 [AXIOS] Response:`, response.data);
    }

    // Backend'deki success response format kontrolü
    if (response.data && typeof response.data === 'object') {
      // Backend success response'ları için success field'ı kontrol et
      if (response.data.success === false && response.data.message) {
        console.warn('⚠️ [AXIOS] Backend returned success=false:', response.data.message);
        toast.error(response.data.message);
      }
    }

    return response;
  },
  (error) => {
    activeRequests = Math.max(0, activeRequests - 1);

    // Connection refused ve network errors için özel handling
    if (error.code === 'ERR_CONNECTION_REFUSED' || error.code === 'ECONNREFUSED') {
      console.error('🔌 [AXIOS] Backend server bağlanamıyor:', error.message);
      toast.error('Backend server\'a bağlanılamıyor. Server çalışır durumda mı?');
      return Promise.reject(error);
    }

    // Timeout hatalarını handle et - NAT operations için özel mesaj
    if (error.code === 'ECONNABORTED') {
      const isNATOperation = error.config?.url?.includes('/nat/');
      console.warn('⏱️ [AXIOS] Request timeout:', error.config?.url);

      if (isNATOperation) {
        toast.error('NAT işlemi zaman aşımına uğradı. İşlem arka planda devam edebilir.');
      } else {
        toast.error('İstek zaman aşımına uğradı. Lütfen tekrar deneyin.');
      }
      return Promise.reject(error);
    }

    // Too many concurrent requests
    if (error.message === 'Too many concurrent requests') {
      console.warn('🚦 [AXIOS] Too many concurrent requests');
      toast.error('Çok fazla eş zamanlı istek. Lütfen bekleyin.');
      return Promise.reject(error);
    }

    const { response } = error;

    // Response varsa status code'a göre handle et
    if (response) {
      const { status, data } = response;

      // Backend error response format'ına uygun handling
      const errorMessage = data?.message || data?.detail || data?.error;
      const errorDetails = data?.details;

      switch (status) {
        case 401:
          console.log('🔐 [AXIOS] 401 Unauthorized - clearing auth data');
          redirectToLogin(errorMessage || 'Oturum süreniz doldu');
          break;

        case 403:
          console.warn('🚫 [AXIOS] 403 Forbidden');
          toast.error(errorMessage || 'Bu işlem için yetkiniz bulunmuyor');
          break;

        case 404:
          console.warn('📍 [AXIOS] 404 Not Found:', error.config?.url);
          toast.error(errorMessage || 'İstenilen kaynak bulunamadı');
          break;

        case 422:
          console.warn('📝 [AXIOS] 422 Validation Error:', data);

          // Backend validation error format'ına uygun
          if (Array.isArray(data?.detail)) {
            // FastAPI validation errors
            const validationErrors = data.detail.map(err =>
              typeof err === 'object' ? err.msg || err.message : err
            ).join(', ');
            toast.error(`Doğrulama hatası: ${validationErrors}`);
          } else if (data?.errors && Array.isArray(data.errors)) {
            // Backend custom validation errors
            const validationErrors = data.errors.join(', ');
            toast.error(`Doğrulama hatası: ${validationErrors}`);
          } else {
            toast.error(errorMessage || 'Geçersiz veri gönderildi');
          }
          break;

        case 429:
          console.warn('🐌 [AXIOS] 429 Rate Limited');
          toast.error('Çok fazla istek gönderildi. Lütfen bekleyin.');
          break;

        case 500:
          console.error('💥 [AXIOS] 500 Internal Server Error');
          const serverError = errorMessage || 'Sunucu hatası';
          toast.error(serverError);

          // NAT operations için özel handling
          if (error.config?.url?.includes('/nat/')) {
            console.error('🔧 [NAT] NAT operation server error:', errorDetails);
          }
          break;

        case 502:
          console.error('🔗 [AXIOS] 502 Bad Gateway');
          toast.error('Sunucu bağlantı hatası. Lütfen daha sonra tekrar deneyin.');
          break;

        case 503:
          console.error('🔧 [AXIOS] 503 Service Unavailable');
          toast.error('Servis şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.');
          break;

        default:
          if (status >= 400 && status < 500) {
            console.warn(`⚠️ [AXIOS] ${status} Client Error:`, data);
            toast.error(errorMessage || 'İstek hatası oluştu');
          } else if (status >= 500) {
            console.error(`💥 [AXIOS] ${status} Server Error:`, data);
            toast.error(errorMessage || 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.');
          }
      }
    } else {
      // Network error or no response
      if (error.code === 'NETWORK_ERROR' || !navigator.onLine) {
        console.warn('🌐 [AXIOS] Network error - offline?');
        toast.error('İnternet bağlantınızı kontrol edin');
      } else {
        console.error('❌ [AXIOS] Unknown error:', error);
        toast.error('Bilinmeyen bir hata oluştu');
      }
    }

    return Promise.reject(error);
  }
);

// Helper functions - Backend'e uygun
export const setAuthToken = (token, expiresIn = 3600, userRole = null) => {
  if (token) {
    localStorage.setItem('token', token);
    localStorage.setItem('tokenExpiry', (Date.now() + (expiresIn * 1000)).toString());

    // Backend'deki role sistemi için
    if (userRole) {
      localStorage.setItem('userRole', userRole);
    }

    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    clearAuthData();
    delete api.defaults.headers.common['Authorization'];
  }
};

export const getAuthToken = () => {
  return localStorage.getItem('token');
};

export const getUserRole = () => {
  return localStorage.getItem('userRole');
};

export const isAuthenticated = () => {
  const token = getAuthToken();
  return token && !isTokenExpired();
};

export const isAdmin = () => {
  const role = getUserRole();
  return role === 'admin';
};

export const clearAuth = () => {
  clearAuthData();
  delete api.defaults.headers.common['Authorization'];
};

// API health check - Backend'e uygun
export const checkAPIHealth = async () => {
  try {
    const response = await api.get('/health', { timeout: 5000 });
    return response.status === 200;
  } catch (error) {
    console.error('❌ [AXIOS] API health check failed:', error);
    return false;
  }
};

// NAT-specific health check
export const checkNATHealth = async () => {
  try {
    const response = await api.get('/api/v1/nat/status', { timeout: 10000 });
    return response.status === 200 && response.data.success;
  } catch (error) {
    console.error('❌ [AXIOS] NAT health check failed:', error);
    return false;
  }
};

// Backend connection test
export const testBackendConnection = async () => {
  try {
    const response = await api.get('/', { timeout: 5000 });
    return {
      connected: true,
      data: response.data,
      status: response.status
    };
  } catch (error) {
    return {
      connected: false,
      error: error.message,
      code: error.code
    };
  }
};

// Request queue için utility
export const getActiveRequestCount = () => activeRequests;

// Enhanced error handling for NAT operations
export const handleNATError = (error, operation = 'NAT operation') => {
  console.error(`🔧 [NAT] ${operation} failed:`, error);

  if (error.response?.status === 500) {
    toast.error(`${operation} sunucu hatası. NAT servisi çalışır durumda mı?`);
  } else if (error.code === 'ECONNABORTED') {
    toast.error(`${operation} zaman aşımına uğradı. İşlem arka planda devam edebilir.`);
  } else {
    toast.error(`${operation} başarısız: ${error.message}`);
  }
};

// Debug bilgileri - Enhanced
if (import.meta.env.VITE_DEBUG === 'true') {
  console.log('🔧 [AXIOS] Enhanced Configuration:', {
    baseURL: api.defaults.baseURL,
    timeout: api.defaults.timeout,
    maxConcurrentRequests: MAX_CONCURRENT_REQUESTS,
    natSupport: true,
    backendVersion: 'FastAPI 2.0.0',
    features: [
      'Enhanced JWT Auth',
      'NAT Operations Support',
      'Backend Error Handling',
      'Role-based Access',
      'PC-to-PC Sharing'
    ]
  });
}

export default api;