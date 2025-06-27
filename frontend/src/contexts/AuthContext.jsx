import React, { createContext, useContext, useState, useEffect } from 'react';

console.log('🔐 [AUTH] Enhanced AuthContext loaded for KOBI Firewall');

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    console.error('❌ [AUTH] useAuth must be used within AuthProvider!');
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Cross-browser timeout implementation
const createTimeoutSignal = (timeoutMs) => {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller.signal;
};

// Enhanced input sanitization for backend compatibility
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  // Backend-safe character filtering
  const dangerous = /[<>${}[\]()\\]/g;
  return input.replace(dangerous, '').trim();
};

// Enhanced validation for backend auth requirements
const validateInput = (username, password) => {
  const errors = [];

  // Username validation - Backend uyumlu
  if (!username || username.length < 3) {
    errors.push('Kullanıcı adı en az 3 karakter olmalıdır');
  }
  if (username && username.length > 50) {
    errors.push('Kullanıcı adı en fazla 50 karakter olabilir');
  }
  if (username && !/^[a-zA-Z0-9_.-]+$/.test(username)) {
    errors.push('Kullanıcı adı sadece harf, rakam, _, -, . karakterlerini içerebilir');
  }

  // Password validation - Backend requirements
  if (!password || password.length < 8) {
    errors.push('Parola en az 8 karakter olmalıdır');
  }
  if (password && password.length > 128) {
    errors.push('Parola en fazla 128 karakter olabilir');
  }

  return errors;
};

export const AuthProvider = ({ children }) => {
  console.log('🔐 [AUTH] Enhanced AuthProvider initialized');

  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [userPermissions, setUserPermissions] = useState([]);

  console.log('🔐 [AUTH] Current enhanced state:', {
    isAuthenticated,
    isLoading,
    user: user?.username,
    userRole,
    permissions: userPermissions.length,
    loginAttempts,
    isBlocked
  });

  // Enhanced rate limiting
  const MAX_LOGIN_ATTEMPTS = 5;
  const BLOCK_DURATION = 5 * 60 * 1000; // 5 minutes

  // Enhanced backend URL configuration
  const getBackendUrl = () => {
    // Development proxy mode
    if (import.meta.env.DEV) {
      console.log('🌍 [AUTH] Using development proxy mode');
      return ''; // Use proxy
    }

    // Production URL configuration
    const envUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL;
    if (envUrl) {
      console.log('🌍 [AUTH] Using environment URL:', envUrl);
      return envUrl;
    }

    // Fallback
    const fallbackUrl = 'http://localhost:8000';
    console.log('🌍 [AUTH] Using fallback URL:', fallbackUrl);
    return fallbackUrl;
  };

  // Enhanced token validation
  const isTokenValid = (token, expiry) => {
    if (!token || !expiry) return false;

    const expiryTime = parseInt(expiry);
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000; // 5 minutes buffer

    return now < (expiryTime - fiveMinutes);
  };

  useEffect(() => {
    console.log('🔄 [AUTH] Enhanced auth check starting');

    const checkAuth = async () => {
      try {
        // Check login block status
        const blockData = localStorage.getItem('loginBlock');
        if (blockData) {
          const { timestamp, attempts } = JSON.parse(blockData);
          const now = Date.now();

          if (now - timestamp < BLOCK_DURATION && attempts >= MAX_LOGIN_ATTEMPTS) {
            setIsBlocked(true);
            setLoginAttempts(attempts);
            console.log('🚫 [AUTH] Login blocked due to too many attempts');
          } else if (now - timestamp >= BLOCK_DURATION) {
            localStorage.removeItem('loginBlock');
            setIsBlocked(false);
            setLoginAttempts(0);
            console.log('✅ [AUTH] Login block expired, cleared');
          }
        }

        // Get auth data from localStorage
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');
        const tokenExpiry = localStorage.getItem('tokenExpiry');
        const storedRole = localStorage.getItem('userRole');
        const storedPermissions = localStorage.getItem('userPermissions');

        console.log('📋 [AUTH] Enhanced localStorage check:', {
          hasToken: !!token,
          hasUser: !!userData,
          hasExpiry: !!tokenExpiry,
          hasRole: !!storedRole,
          hasPermissions: !!storedPermissions,
          tokenLength: token?.length
        });

        if (token && userData && tokenExpiry) {
          // Validate token expiry
          if (!isTokenValid(token, tokenExpiry)) {
            console.log('⏰ [AUTH] Token expired, clearing auth data');
            logout();
            return;
          }

          try {
            const parsedUser = JSON.parse(userData);

            // Enhanced user data validation
            if (parsedUser && parsedUser.username && typeof parsedUser.username === 'string') {
              console.log('✅ [AUTH] Valid enhanced auth data found:', {
                username: parsedUser.username,
                role: parsedUser.role || storedRole,
                isActive: parsedUser.is_active
              });

              setUser(parsedUser);
              setIsAuthenticated(true);

              // Set role and permissions
              const role = parsedUser.role || storedRole || 'viewer';
              setUserRole(role);

              // Parse permissions
              try {
                const permissions = storedPermissions ? JSON.parse(storedPermissions) : parsedUser.permissions || [];
                setUserPermissions(Array.isArray(permissions) ? permissions : []);
              } catch {
                setUserPermissions([]);
              }

              // Optional: Verify token with backend
              await verifyTokenWithBackend(token);

            } else {
              console.error('❌ [AUTH] Invalid user data structure');
              logout();
            }
          } catch (parseError) {
            console.error('❌ [AUTH] User data parse error:', parseError);
            logout();
          }
        } else {
          console.log('❌ [AUTH] Incomplete auth data found');
          setIsAuthenticated(false);
          setUser(null);
          setUserRole(null);
          setUserPermissions([]);
        }
      } catch (error) {
        console.error('❌ [AUTH] Enhanced auth check error:', error);
        logout();
      } finally {
        console.log('✅ [AUTH] Enhanced auth check completed');
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Token verification with backend
  const verifyTokenWithBackend = async (token) => {
    try {
      const baseUrl = getBackendUrl();
      const verifyUrl = baseUrl ? `${baseUrl}/api/v1/auth/verify` : '/api/v1/auth/verify';

      const response = await fetch(verifyUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        signal: createTimeoutSignal(5000)
      });

      if (!response.ok) {
        throw new Error('Token verification failed');
      }

      const data = await response.json();
      console.log('✅ [AUTH] Token verified with backend:', data.success);

    } catch (error) {
      console.warn('⚠️ [AUTH] Token verification failed (continuing):', error.message);
      // Don't logout on verification failure - might be network issue
    }
  };

  const handleLoginBlock = (increment = true) => {
    const attempts = increment ? loginAttempts + 1 : loginAttempts;
    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      const blockData = {
        timestamp: Date.now(),
        attempts: attempts
      };
      localStorage.setItem('loginBlock', JSON.stringify(blockData));
      setIsBlocked(true);
      console.log('🚫 [AUTH] Login blocked due to failed attempts');
    }
    setLoginAttempts(attempts);
  };

  const login = async (credentials) => {
    console.log('🔐 [AUTH] Enhanced login attempt:', credentials.username);

    // Check if blocked
    if (isBlocked) {
      const blockData = JSON.parse(localStorage.getItem('loginBlock') || '{}');
      const remainingTime = Math.ceil((BLOCK_DURATION - (Date.now() - blockData.timestamp)) / 60000);
      return {
        success: false,
        error: `Çok fazla başarısız giriş denemesi. ${remainingTime} dakika sonra tekrar deneyin.`
      };
    }

    try {
      setIsLoading(true);

      // Enhanced input validation
      const sanitizedUsername = sanitizeInput(credentials.username);
      const validationErrors = validateInput(sanitizedUsername, credentials.password);

      if (validationErrors.length > 0) {
        console.log('❌ [AUTH] Enhanced validation failed:', validationErrors);
        return {
          success: false,
          error: validationErrors.join(', ')
        };
      }

      const baseUrl = getBackendUrl();

      // Backend health check
      try {
        const healthUrl = baseUrl ? `${baseUrl}/health` : '/health';
        console.log('🏥 [AUTH] Enhanced health check:', healthUrl);

        const healthResponse = await fetch(healthUrl, {
          method: 'GET',
          signal: createTimeoutSignal(10000),
          headers: {
            'Accept': 'application/json',
            'X-Client-Type': 'kobi-firewall-frontend'
          },
          mode: 'cors',
          credentials: 'include'
        });

        if (healthResponse.ok) {
          const healthData = await healthResponse.json();
          console.log('✅ [AUTH] Enhanced backend health:', {
            status: healthData.status,
            version: healthData.version,
            features: healthData.features?.length || 0
          });
        }
      } catch (healthError) {
        console.warn('⚠️ [AUTH] Health check failed, continuing:', healthError.message);
      }

      // Enhanced authentication endpoints
      const endpoints = [
        '/api/v1/auth/login',  // Enhanced auth endpoint (primary)
        '/api/auth/login'      // Legacy fallback
      ];

      let lastError = null;
      let response = null;
      let data = null;

      for (const endpoint of endpoints) {
        try {
          const fullUrl = baseUrl ? `${baseUrl}${endpoint}` : endpoint;
          console.log('🌐 [AUTH] Trying enhanced endpoint:', endpoint);

          // Enhanced login request
          response = await fetch(fullUrl, {
            method: 'POST',
            signal: createTimeoutSignal(30000),
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'X-Client-Type': 'kobi-firewall-frontend',
              'X-Client-Version': '2.0.0',
              'Origin': window.location.origin
            },
            body: JSON.stringify({
              username: sanitizedUsername,
              password: credentials.password,
              remember_me: Boolean(credentials.rememberMe)
            }),
            mode: 'cors',
            credentials: 'include'
          });

          console.log('📨 [AUTH] Enhanced response:', {
            endpoint,
            status: response.status,
            ok: response.ok,
            statusText: response.statusText
          });

          if (response.ok) {
            data = await response.json();
            console.log('✅ [AUTH] Enhanced login success from:', endpoint);
            break;
          } else {
            let errorData;
            try {
              errorData = await response.json();
            } catch {
              errorData = { message: response.statusText };
            }

            // Handle specific error cases
            if (response.status === 401) {
              handleLoginBlock();
              return {
                success: false,
                error: errorData.message || 'Kullanıcı adı veya parola hatalı'
              };
            }

            throw new Error(`HTTP ${response.status}: ${errorData.message || response.statusText}`);
          }
        } catch (error) {
          console.log(`⚠️ [AUTH] Enhanced endpoint ${endpoint} failed:`, error.message);
          lastError = error;
          continue;
        }
      }

      // Handle failed authentication
      if (!response || !response.ok || !data) {
        if (lastError?.name === 'AbortError') {
          return {
            success: false,
            error: 'Bağlantı zaman aşımı - Backend yanıt vermiyor (30s)'
          };
        }

        if (lastError?.message?.includes('fetch')) {
          return {
            success: false,
            error: 'Backend sunucusuna bağlanılamıyor'
          };
        }

        handleLoginBlock();
        return {
          success: false,
          error: lastError?.message || 'Giriş başarısız'
        };
      }

      // Process enhanced successful response
      console.log('📨 [AUTH] Enhanced login response:', {
        hasToken: !!(data.access_token || data.token),
        hasUser: !!data.user,
        hasRole: !!(data.user?.role),
        hasPermissions: !!(data.user?.permissions),
        tokenType: data.token_type
      });

      const token = data.access_token || data.token;
      const userData = data.user;

      if (token && userData) {
        console.log('✅ [AUTH] Enhanced login successful');

        // Reset login attempts
        setLoginAttempts(0);
        setIsBlocked(false);
        localStorage.removeItem('loginBlock');

        // Calculate token expiry
        const expiresIn = data.expires_in || 3600;
        const expiryTime = Date.now() + (expiresIn * 1000);

        // Store enhanced auth data
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('tokenExpiry', expiryTime.toString());

        // Store role and permissions
        if (userData.role) {
          localStorage.setItem('userRole', userData.role);
          setUserRole(userData.role);
        }

        if (userData.permissions) {
          localStorage.setItem('userPermissions', JSON.stringify(userData.permissions));
          setUserPermissions(userData.permissions);
        }

        // Handle remember me
        if (credentials.rememberMe) {
          localStorage.setItem('rememberMe', 'true');
          localStorage.setItem('savedUsername', sanitizedUsername);
        } else {
          localStorage.removeItem('rememberMe');
          localStorage.removeItem('savedUsername');
        }

        setUser(userData);
        setIsAuthenticated(true);

        return { success: true, user: userData };
      } else {
        console.log('❌ [AUTH] Enhanced login failed: Invalid response');
        handleLoginBlock();
        return {
          success: false,
          error: 'Geçersiz yanıt formatı'
        };
      }
    } catch (error) {
      console.error('❌ [AUTH] Enhanced login error:', error);

      if (error.name === 'AbortError') {
        return {
          success: false,
          error: 'Bağlantı zaman aşımı'
        };
      }

      handleLoginBlock();
      return {
        success: false,
        error: `Giriş hatası: ${error.message}`
      };
    } finally {
      console.log('🔄 [AUTH] Enhanced login completed');
      setIsLoading(false);
    }
  };

  const logout = async () => {
    console.log('🚪 [AUTH] Enhanced logout');

    try {
      // Try to call backend logout if token exists
      const token = localStorage.getItem('token');
      if (token) {
        const baseUrl = getBackendUrl();
        const logoutUrl = baseUrl ? `${baseUrl}/api/v1/auth/logout` : '/api/v1/auth/logout';

        try {
          await fetch(logoutUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json'
            },
            signal: createTimeoutSignal(5000)
          });
          console.log('✅ [AUTH] Backend logout successful');
        } catch (error) {
          console.warn('⚠️ [AUTH] Backend logout failed (continuing):', error.message);
        }
      }
    } catch (error) {
      console.warn('⚠️ [AUTH] Logout cleanup error:', error.message);
    }

    // Clear all auth data
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('tokenExpiry');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userPermissions');

    // Keep remember me if it was set
    const rememberMe = localStorage.getItem('rememberMe');
    if (rememberMe !== 'true') {
      localStorage.removeItem('rememberMe');
      localStorage.removeItem('savedUsername');
    }

    setUser(null);
    setIsAuthenticated(false);
    setUserRole(null);
    setUserPermissions([]);
    setIsLoading(false);
  };

  // Enhanced utility functions
  const isAdmin = () => {
    return userRole === 'admin';
  };

  const hasPermission = (permission) => {
    if (userRole === 'admin') return true;
    return userPermissions.includes(permission) || userPermissions.includes('*');
  };

  const canAccessNAT = () => {
    return isAdmin() || hasPermission('nat_management');
  };

  const value = {
    user,
    isAuthenticated,
    isLoading,
    authLoading: isLoading, // Compatibility
    loginAttempts,
    isBlocked,
    userRole,
    userPermissions,
    login,
    logout,
    // Enhanced utilities
    isAdmin,
    hasPermission,
    canAccessNAT,
    // Backward compatibility
    isTokenValid: () => isAuthenticated
  };

  console.log('🔐 [AUTH] Enhanced AuthProvider rendering:', {
    isAuthenticated,
    isLoading,
    hasUser: !!user,
    userRole,
    permissions: userPermissions.length,
    canAccessNAT: canAccessNAT()
  });

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};