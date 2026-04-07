import axios from 'axios'

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5007'

export const api = axios.create({
  baseURL,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('np_token')
  if (token) {
    if (config.headers && typeof (config.headers as { set?: unknown }).set === 'function') {
      ;(config.headers as { set: (name: string, value: string) => void }).set('Authorization', `Bearer ${token}`)
    } else {
      config.headers = { Authorization: `Bearer ${token}` } as never
    }
  }
  return config
})

export type LoginApiResponse =
  | { token: string; mfaRequired?: false }
  | { mfaRequired: true; mfaToken: string; email?: string }

export type MfaSetupResponse = {
  sharedKey?: string
  authenticatorUri?: string
}

export async function loginRequest(email: string, password: string): Promise<LoginApiResponse> {
  const res = await api.post<LoginApiResponse>('/api/auth/login', { email, password })
  return res.data
}

export async function verifyMfaLoginRequest(mfaToken: string, code: string): Promise<{ token: string }> {
  const res = await api.post<{ token: string }>('/api/auth/mfa/verify-login', { mfaToken, code })
  return res.data
}

export async function getMfaSetupRequest(): Promise<MfaSetupResponse> {
  const res = await api.get<MfaSetupResponse>('/api/auth/mfa/setup')
  return res.data
}

export async function enableMfaRequest(code: string): Promise<{ success?: boolean }> {
  const res = await api.post<{ success?: boolean }>('/api/auth/mfa/enable', { code })
  return res.data
}

export async function getResidentRecommendations(id: number): Promise<number[] | null> {
  try {
    const res = await api.get<{
      recommendedResidentIds?: number[]
      recommendations?: number[]
      ids?: number[]
    }>(`/api/residents/${id}/recommendations`)
    const ids =
      res.data.recommendedResidentIds ??
      res.data.recommendations ??
      res.data.ids ??
      []
    return Array.isArray(ids) ? ids : []
  } catch {
    // Graceful fallback when ML output is not yet available.
    return null
  }
}