import React, { createContext, useContext, useMemo, useState } from 'react'
import { isAxiosError } from 'axios'
import { api, enableMfaRequest, getMfaSetupRequest, loginRequest, verifyMfaLoginRequest } from '../lib/api'
import { decodeEmail, decodeRoles } from '../auth/jwt'

type AuthUser = {
  email: string
  roles: string[]
}

type MfaPendingState = {
  mfaToken: string
  email?: string
  requiresMfaSetup?: boolean
  sharedKey?: string
  authenticatorUri?: string
}

type AuthContextValue = {
  token: string | null
  user: AuthUser | null
  pendingMfa: MfaPendingState | null
  login: (email: string, password: string) => Promise<AuthUser | null>
  verifyMfa: (code: string) => Promise<AuthUser>
  getMfaSetup: () => Promise<{ sharedKey?: string; authenticatorUri?: string }>
  enableMfa: (code: string) => Promise<void>
  signup: (email: string, password: string) => Promise<AuthUser>
  logout: () => void
  hasRole: (role: string) => boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

function readInitial(): { token: string | null; user: AuthUser | null } {
  const token = localStorage.getItem('np_token')
  if (!token) return { token: null, user: null }
  const email = decodeEmail(token)
  const roles = decodeRoles(token)
  if (!email) return { token: null, user: null }
  return { token, user: { email, roles } }
}

function readPendingMfa(): MfaPendingState | null {
  const raw = localStorage.getItem('np_mfa_pending')
  if (!raw) return null
  try {
    return JSON.parse(raw) as MfaPendingState
  } catch {
    localStorage.removeItem('np_mfa_pending')
    return null
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const initial = useMemo(readInitial, [])
  const initialPendingMfa = useMemo(readPendingMfa, [])
  const [token, setToken] = useState<string | null>(initial.token)
  const [user, setUser] = useState<AuthUser | null>(initial.user)
  const [pendingMfa, setPendingMfa] = useState<MfaPendingState | null>(initialPendingMfa)

  function applyTokenAndUser(t: string, fallbackEmail: string) {
    localStorage.setItem('np_token', t)
    const decodedEmail = decodeEmail(t) || fallbackEmail
    const roles = decodeRoles(t)
    const u = { email: decodedEmail, roles }
    setToken(t)
    setUser(u)
    return u
  }

  async function login(email: string, password: string) {
    try {
      const res = await loginRequest(email, password)
      if ('mfaRequired' in res && res.mfaRequired) {
        const nextPendingMfa = {
          mfaToken: res.mfaToken,
          email: res.email ?? email,
          requiresMfaSetup: res.requiresMfaSetup ?? false,
          sharedKey: res.sharedKey,
          authenticatorUri: res.authenticatorUri,
        }
        setPendingMfa(nextPendingMfa)
        localStorage.setItem('np_mfa_pending', JSON.stringify(nextPendingMfa))
        // Keep redirect logic in context per requested flow.
        window.location.assign('/mfa-verify')
        return null
      }
      setPendingMfa(null)
      localStorage.removeItem('np_mfa_pending')
      return applyTokenAndUser(res.token, email)
    } catch (e: unknown) {
      if (isAxiosError(e) && e.response?.data) {
        const data = e.response.data as { message?: string }
        if (data.message) throw new Error(data.message)
      }
      throw e instanceof Error ? e : new Error('Sign in failed.')
    }
  }

  async function verifyMfa(code: string) {
    if (!pendingMfa?.mfaToken) {
      throw new Error('No pending MFA login found. Please sign in again.')
    }
    try {
      const res = await verifyMfaLoginRequest(pendingMfa.mfaToken, code)
      setPendingMfa(null)
      localStorage.removeItem('np_mfa_pending')
      return applyTokenAndUser(res.token, pendingMfa.email ?? '')
    } catch (e: unknown) {
      if (isAxiosError(e) && e.response?.data) {
        const data = e.response.data as { message?: string }
        if (data.message) throw new Error(data.message)
      }
      throw e instanceof Error ? e : new Error('MFA verification failed.')
    }
  }

  async function getMfaSetup() {
    try {
      return await getMfaSetupRequest()
    } catch (e: unknown) {
      if (isAxiosError(e) && e.response?.data) {
        const data = e.response.data as { message?: string }
        if (data.message) throw new Error(data.message)
      }
      throw e instanceof Error ? e : new Error('Failed to load MFA setup details.')
    }
  }

  async function enableMfa(code: string) {
    try {
      await enableMfaRequest(code)
    } catch (e: unknown) {
      if (isAxiosError(e) && e.response?.data) {
        const data = e.response.data as { message?: string }
        if (data.message) throw new Error(data.message)
      }
      throw e instanceof Error ? e : new Error('Failed to enable MFA.')
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
    localStorage.removeItem('np_mfa_pending')
    setToken(null)
    setUser(null)
    setPendingMfa(null)
  }

  function hasRole(role: string) {
    return !!user?.roles?.includes(role)
  }

  const value: AuthContextValue = {
    token,
    user,
    pendingMfa,
    login,
    verifyMfa,
    getMfaSetup,
    enableMfa,
    signup,
    logout,
    hasRole,
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

