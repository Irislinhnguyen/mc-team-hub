'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

export interface User {
  email: string
  name?: string
  role: string
  accessLevel: string
  authType?: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  error: string | null
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUser = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/auth/me')

      if (!response.ok) {
        if (response.status === 401) {
          setUser(null)
          return
        }
        throw new Error('Failed to fetch user')
      }

      const data = await response.json()
      setUser(data.user)
    } catch (err) {
      console.error('[AuthContext] Error fetching user:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      setUser(null)
      window.location.href = '/auth'
    } catch (err) {
      console.error('[AuthContext] Error during logout:', err)
    }
  }

  const refreshUser = async () => {
    await fetchUser()
  }

  useEffect(() => {
    fetchUser()
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoading, error, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function useUser() {
  const { user } = useAuth()
  return user
}
