import React, { createContext, useContext, useMemo, useState } from 'react'
import { isAxiosError } from 'axios'
import { api } from '../lib/api'
import { decodeEmail, decodeRoles } from '../auth/jwt'

type AuthUser = {
  email: string
  roles: string[]
}

type AuthContextValue = {
  token: string | null
  user: AuthUser | null
  login: (email: string, password: string) => Promise<AuthUser>
  signup: (email: string, password: string) => Promise<AuthUser>
  logout: () => void
  hasRole: (role: string) => boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

/** UI convenience: still uses the real API and a valid JWT (IdentitySeeder admin user). */
const DEMO_EMAIL = 'admin@novapath.org'
const DEMO_PASSWORD = 'demo123'
const SEEDED_ADMIN_EMAIL = 'admin@test.com'
const SEEDED_ADMIN_PASSWORD = 'Admin@12345678!'

function readInitial(): { token: string | null; user: AuthUser | null } {
  const token = localStorage.getItem('np_token')
  if (!token) return { token: null, user: null }
  const email = decodeEmail(token)
  const roles = decodeRoles(token)
  if (!email) return { token: null, user: null }
  return { token, user: { email, roles } }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const initial = useMemo(readInitial, [])
  const [token, setToken] = useState<string | null>(initial.token)
  const [user, setUser] = useState<AuthUser | null>(initial.user)

  async function login(email: string, password: string) {
    let loginEmail = email
    let loginPassword = password
    if (email.toLowerCase() === DEMO_EMAIL && password === DEMO_PASSWORD) {
      loginEmail = SEEDED_ADMIN_EMAIL
      loginPassword = SEEDED_ADMIN_PASSWORD
    }

    try {
      const res = await api.post<{ token: string }>('/api/auth/login', {
        email: loginEmail,
        password: loginPassword,
      })
      const t = res.data.token
      localStorage.setItem('np_token', t)
      const decodedEmail = decodeEmail(t) || email
      const roles = decodeRoles(t)
      const u = { email: decodedEmail, roles }
      setToken(t)
      setUser(u)
      return u
    } catch (e: unknown) {
      if (isAxiosError(e) && e.response?.data) {
        const data = e.response.data as { message?: string }
        if (data.message) throw new Error(data.message)
      }
      throw e instanceof Error ? e : new Error('Sign in failed.')
    }
  }

  async function signup(email: string, password: string) {
    try {
      const res = await api.post<{ token: string }>('/api/auth/signup', { email, password })
      const t = res.data.token
      localStorage.setItem('np_token', t)
      const decodedEmail = decodeEmail(t) || email.trim()
      const roles = decodeRoles(t)
      const u = { email: decodedEmail, roles }
      setToken(t)
      setUser(u)
      return u
    } catch (e: unknown) {
      if (isAxiosError(e) && e.response?.data) {
        const data = e.response.data as { message?: string; errors?: string[] }
        const detail = data.errors?.length ? data.errors.join(' ') : data.message
        if (detail) throw new Error(detail)
      }
      throw e instanceof Error ? e : new Error('Registration failed.')
    }
  }

  function logout() {
    localStorage.removeItem('np_token')
    setToken(null)
    setUser(null)
  }

  function hasRole(role: string) {
    return !!user?.roles?.includes(role)
  }

  const value: AuthContextValue = { token, user, login, signup, logout, hasRole }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

