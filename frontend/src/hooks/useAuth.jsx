import React, { createContext, useContext, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import apiService from '../services/api'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isInitialized, setIsInitialized] = useState(false)

  // Get current user data
  const {
    data: user,
    isLoading: isLoadingUser,
    error: userError,
  } = useQuery({
    queryKey: ['currentUser'],
    queryFn: apiService.getCurrentUser,
    enabled: !!localStorage.getItem('auth_token'),
    retry: false,
    onError: () => {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('user_data')
    },
  })

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: apiService.login,
    onSuccess: (data) => {
      console.log('Login successful:', data)
      localStorage.setItem('auth_token', data.access_token)
      if (data.user) {
        localStorage.setItem('user_data', JSON.stringify(data.user))
      }
      queryClient.invalidateQueries(['currentUser'])
      toast.success('Login successful!')
      navigate('/dashboard')
    },
    onError: (error) => {
      console.error('Login failed:', error)
      const message = error.response?.data?.detail ||
                      error.response?.data?.message ||
                      error.message ||
                      'Login failed'
      toast.error(message)
    },
  })

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: apiService.logout,
    onSettled: () => {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('user_data')
      queryClient.clear()
      toast.success('Logged out successfully')
      navigate('/login')
    },
  })

  // Initialize auth state
  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    if (!token) {
      setIsInitialized(true)
    } else if (user || userError) {
      setIsInitialized(true)
    }
  }, [user, userError])

  // Check if user is authenticated
  const isAuthenticated = !!user && !!localStorage.getItem('auth_token')

  // Auth functions
  const login = async (credentials) => {
    console.log('Starting login process:', credentials.username)
    return loginMutation.mutateAsync(credentials)
  }

  const logout = async () => {
    return logoutMutation.mutateAsync()
  }

  const getUserDisplayName = () => {
    if (!user) return 'Guest'
    return user.username || user.email || 'User'
  }

  const getUserInitials = () => {
    const name = getUserDisplayName()
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'GU'
  }

  const hasPermission = (permission) => {
    if (!user) return false
    if (user.role === 'admin') return true
    return user.permissions?.includes(permission) || false
  }

  const value = {
    user,
    isAuthenticated,
    isLoading: isLoadingUser || !isInitialized,
    isInitialized,
    login,
    logout,
    getUserDisplayName,
    getUserInitials,
    hasPermission,
    isLoggingIn: loginMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default useAuth