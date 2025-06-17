import axios from 'axios'
import toast from 'react-hot-toast'

// Create axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    console.log('API Request:', config.method?.toUpperCase(), config.url, config.data)
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    console.error('Request Error:', error)
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', response.status, response.config.url)
    return response
  },
  async (error) => {
    console.error('API Error:', error.response?.status, error.response?.data || error.message)

    const originalRequest = error.config

    // Handle 401 errors (unauthorized)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      localStorage.removeItem('auth_token')
      localStorage.removeItem('user_data')
      window.location.href = '/login'
      return Promise.reject(error)
    }

    // Handle other common errors
    if (error.response?.status === 403) {
      toast.error('Access denied. Insufficient permissions.')
    }
    if (error.response?.status === 429) {
      toast.error('Rate limit exceeded. Please try again later.')
    }
    if (error.response?.status >= 500) {
      toast.error('Server error. Please try again later.')
    }
    if (error.code === 'ERR_NETWORK' || !error.response) {
      toast.error('Network error. Cannot connect to server.')
    }

    return Promise.reject(error)
  }
)

// API service methods
const apiService = {
  // Authentication
  async login(credentials) {
    console.log('Attempting login with:', credentials.username)
    const response = await api.post('/auth/login', credentials)
    return response.data
  },

  async logout() {
    try {
      const response = await api.post('/auth/logout')
      return response.data
    } catch (error) {
      console.warn('Logout API call failed, proceeding with local cleanup')
      return { message: 'Logged out locally' }
    }
  },

  async getCurrentUser() {
    const response = await api.get('/auth/me')
    return response.data
  },

  // Health check
  async healthCheck() {
    const response = await api.get('/health', {
      baseURL: 'http://127.0.0.1:8000' // Direct health check without /api/v1
    })
    return response.data
  },

  // System stats
  async getSystemStats() {
    try {
      const response = await api.get('/status/dashboard')
      return response.data
    } catch (error) {
      console.warn('Failed to get system stats, using mock data')
      return {
        cpu_percent: 45,
        memory_percent: 67,
        uptime_seconds: 86400,
        blocked_requests_24h: 150,
        active_connections: 23,
        new_connections_rate: 5
      }
    }
  },

  async getSystemHealth() {
    try {
      const response = await api.get('/health', {
        baseURL: 'http://127.0.0.1:8000'
      })
      return response.data
    } catch (error) {
      console.warn('Health check failed, using mock data')
      return {
        status: 'unhealthy',
        network: 'unhealthy',
        database: 'unknown',
        api: 'unhealthy',
        checks: {
          dns: false,
          database: false
        }
      }
    }
  },

  // Firewall
  async getFirewallRules(params = {}) {
    try {
      const response = await api.get('/firewall/rules', { params })
      return response.data
    } catch (error) {
      console.warn('Failed to get firewall rules, using mock data')
      return {
        data: [],
        total: 0,
        page: 1,
        pages: 1
      }
    }
  },

  async getFirewallStats() {
    try {
      const response = await api.get('/firewall/rules/stats')
      return response.data
    } catch (error) {
      console.warn('Failed to get firewall stats, using mock data')
      return {
        total_rules: 0,
        enabled_rules: 0,
        allow_rules: 0,
        deny_rules: 0,
        total_hits: 0
      }
    }
  },

  async createFirewallRule(ruleData) {
    const response = await api.post('/firewall/rules', ruleData)
    return response.data
  },

  async updateFirewallRule(ruleId, ruleData) {
    const response = await api.put(`/firewall/rules/${ruleId}`, ruleData)
    return response.data
  },

  async deleteFirewallRule(ruleId) {
    const response = await api.delete(`/firewall/rules/${ruleId}`)
    return response.data
  },

  // Security alerts
  async getSecurityAlerts(params = {}) {
    try {
      const response = await api.get('/logs/alerts', { params })
      return response.data
    } catch (error) {
      console.warn('Failed to get security alerts, using mock data')
      return {
        data: []
      }
    }
  },

  // Generic methods
  async get(endpoint, params = {}) {
    const response = await api.get(endpoint, { params })
    return response.data
  },

  async post(endpoint, data = {}) {
    const response = await api.post(endpoint, data)
    return response.data
  },

  async put(endpoint, data = {}) {
    const response = await api.put(endpoint, data)
    return response.data
  },

  async delete(endpoint) {
    const response = await api.delete(endpoint)
    return response.data
  },
}

export default apiService