import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'

console.log('🔑 [LOGIN] Login component dosyası yüklendi')

const Login = () => {
  console.log('🔑 [LOGIN] Login component render başladı')

  const [formData, setFormData] = useState({
    username: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)

  const navigate = useNavigate()
  const location = useLocation()

  // Auth hook'u güvenli şekilde kullan
  let authHook
  try {
    authHook = useAuth()
    console.log('✅ [LOGIN] useAuth hook başarılı')
  } catch (error) {
    console.error('❌ [LOGIN] useAuth hook hatası:', error)
    authHook = {
      login: async () => ({ success: false, error: 'Auth context hatası' }),
      isAuthenticated: false,
      isLoading: false
    }
  }

  const { login, isAuthenticated, isLoading: authLoading } = authHook

  console.log('🔑 [LOGIN] Auth state:', { isAuthenticated, authLoading })

  // Redirect if already authenticated
  useEffect(() => {
    console.log('🔄 [LOGIN] useEffect - auth redirect kontrolü')
    if (isAuthenticated && !authLoading) {
      const from = location.state?.from?.pathname || '/dashboard'
      console.log('✅ [LOGIN] Already authenticated, redirecting to:', from)
      navigate(from, { replace: true })
    }
  }, [isAuthenticated, authLoading, navigate, location])

  // Remember me durumunu kontrol et
  useEffect(() => {
    const savedRememberMe = localStorage.getItem('rememberMe')
    const savedUsername = localStorage.getItem('savedUsername')

    if (savedRememberMe === 'true' && savedUsername) {
      setRememberMe(true)
      setFormData(prev => ({
        ...prev,
        username: savedUsername
      }))
      console.log('🔄 [LOGIN] Remember me data restored')
    }
  }, [])

  // Show loading while checking auth status
  if (authLoading) {
    console.log('⏳ [LOGIN] Auth loading state')
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="relative mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full shadow-2xl">
              <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
            </div>
            <div className="absolute inset-0 rounded-full border-4 border-blue-500/30 animate-ping"></div>
          </div>
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
            <span className="text-white text-lg font-medium">Giriş durumu kontrol ediliyor...</span>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
          </div>
        </div>
      </div>
    )
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    console.log('📝 [LOGIN] Form data changed:', { [name]: '***' })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    console.log('🚀 [LOGIN] Form submit')

    if (!formData.username.trim() || !formData.password.trim()) {
      console.log('❌ [LOGIN] Validation failed')
      toast.error('Kullanıcı adı ve parola gerekli')
      return
    }

    setIsLoading(true)
    console.log('🔄 [LOGIN] Loading state true')

    try {
      console.log('📤 [LOGIN] Login çağrısı yapılıyor...')
      const result = await login({
        username: formData.username.trim(),
        password: formData.password,
        rememberMe
      })

      console.log('📨 [LOGIN] Login result:', { success: result.success })

      if (result.success) {
        // Remember me işlemi
        if (rememberMe) {
          localStorage.setItem('rememberMe', 'true')
          localStorage.setItem('savedUsername', formData.username.trim())
          console.log('💾 [LOGIN] Remember me data saved')
        } else {
          localStorage.removeItem('rememberMe')
          localStorage.removeItem('savedUsername')
          console.log('🗑️ [LOGIN] Remember me data cleared')
        }

        toast.success('Giriş başarılı! Yönlendiriliyorsunuz...')
        const from = location.state?.from?.pathname || '/dashboard'
        console.log('✅ [LOGIN] Login successful, navigating to:', from)
        navigate(from, { replace: true })
      } else {
        console.log('❌ [LOGIN] Login failed:', result.error)
        toast.error(result.error || 'Giriş yapılırken bir hata oluştu')
      }
    } catch (error) {
      console.error('❌ [LOGIN] Login exception:', error)
      toast.error('Giriş yapılırken bir hata oluştu')
    } finally {
      console.log('🔄 [LOGIN] Loading state false')
      setIsLoading(false)
    }
  }

  console.log('🎨 [LOGIN] Rendering form')

  return (
    <div className="login-container min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Debug info - sadece development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-4 left-4 text-xs text-gray-500 bg-black/20 p-2 rounded">
          <div>Debug: {new Date().toLocaleTimeString()}</div>
          <div>Auth: {isAuthenticated ? 'Yes' : 'No'}</div>
          <div>Loading: {authLoading ? 'Yes' : 'No'}</div>
        </div>
      )}

      {/* Backend Status */}
      <div className="absolute top-6 right-6 flex items-center space-x-2">
        <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
        <span className="text-gray-300 text-sm font-medium">Backend: Port 8000</span>
      </div>

      {/* Main Login Container */}
      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          {/* NetGate Logo - Düzeltilmiş firewall/shield icon */}
          <div className="login-logo inline-flex items-center justify-center w-20 h-20 rounded-xl mb-6 shadow-2xl">
            <svg
              className="w-10 h-10 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M12,7C13.4,7 14.8,8.6 14.8,10.5V11.5C15.4,11.5 16,12.4 16,13V16C16,17.4 15.4,18 14.8,18H9.2C8.6,18 8,17.4 8,16V13C8,12.4 8.6,11.5 9.2,11.5V10.5C9.2,8.6 10.6,7 12,7M12,8.2C11.2,8.2 10.5,8.7 10.5,10.5V11.5H13.5V10.5C13.5,8.7 12.8,8.2 12,8.2Z"/>
            </svg>
          </div>

          {/* Başlık ve spacing düzeltmesi */}
          <h1 className="text-3xl font-bold text-white mb-2">NetGate</h1>
          <p className="text-gray-400 text-sm mb-6">Güvenlik Duvarı Yönetim Paneli</p>
        </div>

        {/* Login Form */}
        <div className="login-form rounded-2xl shadow-2xl p-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-white mb-2">Giriş Yap</h2>
            <p className="text-gray-400 text-sm">Sisteme erişim için bilgilerinizi girin</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username Field */}
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Kullanıcı Adı
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                className="login-input w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="Kullanıcı adınızı girin"
                disabled={isLoading}
                required
                maxLength={50}
                autoComplete="username"
              />
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Parola
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="login-input w-full px-4 py-3 pr-12 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="Parolanızı girin"
                  disabled={isLoading}
                  required
                  maxLength={128}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
                  disabled={isLoading}
                  aria-label={showPassword ? 'Parolayı gizle' : 'Parolayı göster'}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="remember-me-checkbox w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500 focus:ring-2"
                  disabled={isLoading}
                />
                <span className="ml-2 text-sm text-gray-300">Beni hatırla</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !formData.username.trim() || !formData.password.trim()}
              className="login-button w-full text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center space-x-2 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="login-spinner w-4 h-4 rounded-full"></div>
                  <span>Giriş yapılıyor...</span>
                </>
              ) : (
                <span>Giriş Yap</span>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-gray-500 text-sm">NetGate Güvenlik Duvarı v2.0</p>
          <p className="text-gray-600 text-xs mt-1">© 2024 NetGate Security Solutions</p>
        </div>
      </div>
    </div>
  )
}

export default Login