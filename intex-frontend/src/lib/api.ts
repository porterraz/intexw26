import axios from 'axios'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5007/api'

const apiOrigin = API_BASE_URL.endsWith('/api')
  ? API_BASE_URL.slice(0, -'/api'.length)
  : API_BASE_URL

export const api = axios.create({
  baseURL: apiOrigin,
})

export const getHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('np_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

api.interceptors.request.use((config) => {
  const headers = getHeaders()
  if (headers.Authorization) {
    if (config.headers && typeof (config.headers as { set?: unknown }).set === 'function') {
      ;(config.headers as { set: (name: string, value: string) => void }).set('Authorization', headers.Authorization)
    } else {
      config.headers = { ...headers } as never
    }
  }
  return config
})

export type LoginApiResponse =
  | { token: string; mfaRequired?: false }
  | {
      mfaRequired: true
      mfaToken: string
      email?: string
      requiresMfaSetup?: boolean
      sharedKey?: string
      authenticatorUri?: string
    }

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

export type ResidentRecommendation = {
  matchId: number
  similarityScore: number
  matchReason: string
}

export type ResidentMlRecommendations = {
  residentId: number
  modelUsed?: string
  peerMatches: ResidentRecommendation[]
  suggestedInterventions: string[]
}

export async function getResidentRecommendations(id: number): Promise<ResidentMlRecommendations | null> {
  try {
    const res = await api.get<{
      residentId?: number
      modelUsed?: string
      peerMatches?: ResidentRecommendation[]
      suggestedInterventions?: string[]
      recommendedResidentIds?: number[]
      recommendations?: number[]
      ids?: number[]
    }>(`/api/residents/${id}/recommendations`)
    const peerMatches = Array.isArray(res.data.peerMatches)
      ? res.data.peerMatches
      : (res.data.recommendedResidentIds ?? res.data.recommendations ?? res.data.ids ?? []).map((matchId) => ({
          matchId,
          similarityScore: 0,
          matchReason: 'Recommended by model output',
        }))
    const suggestedInterventions = Array.isArray(res.data.suggestedInterventions)
      ? res.data.suggestedInterventions
      : []

    return {
      residentId: res.data.residentId ?? id,
      modelUsed: res.data.modelUsed,
      peerMatches,
      suggestedInterventions,
    }
  } catch {
    // Graceful fallback when ML output is not yet available.
    return null
  }
}

export type ProcessRecording = {
  recordingId: number
  residentId: number
  sessionDate: string
  socialWorker: string
  sessionType: string
  sessionDurationMinutes: number
  emotionalStateObserved: string
  emotionalStateEnd: string
  sessionNarrative: string
  interventionsApplied: string
  followUpActions: string
  progressNoted: boolean
  concernsFlagged: boolean
  referralMade: boolean
}

export type HomeVisitation = {
  visitationId: number
  residentId: number
  visitDate: string
  socialWorker: string
  visitType: string
  locationVisited: string
  familyMembersPresent: string
  purpose: string
  observations: string
  familyCooperationLevel: string
  safetyConcernsNoted: boolean
  followUpNeeded: boolean
  followUpNotes?: string | null
  visitOutcome: string
}

export async function getProcessRecordings(residentId: number): Promise<ProcessRecording[]> {
  const res = await api.get<ProcessRecording[]>(`/api/process-recordings/resident/${residentId}`)
  return res.data
}

export async function createProcessRecording(payload: {
  residentId: number
  date: string
  notes: string
}): Promise<ProcessRecording> {
  const body = {
    residentId: payload.residentId,
    sessionDate: payload.date,
    socialWorker: 'Unassigned',
    sessionType: 'General',
    sessionDurationMinutes: 30,
    emotionalStateObserved: 'Not assessed',
    emotionalStateEnd: 'Not assessed',
    sessionNarrative: payload.notes,
    interventionsApplied: 'N/A',
    followUpActions: 'N/A',
    progressNoted: false,
    concernsFlagged: false,
    referralMade: false,
  }
  const res = await api.post<ProcessRecording>('/api/process-recordings', body, { headers: getHeaders() })
  return res.data
}

export async function deleteProcessRecording(recordingId: number): Promise<void> {
  await api.delete(`/api/process-recordings/${recordingId}`, {
    params: { confirm: true },
    headers: getHeaders(),
  })
}

export async function getHomeVisitations(residentId: number): Promise<HomeVisitation[]> {
  const res = await api.get<HomeVisitation[]>(`/api/home-visitations/resident/${residentId}`)
  return res.data
}

export async function getCaseConferences(residentId: number): Promise<HomeVisitation[]> {
  const res = await api.get<HomeVisitation[]>('/api/home-visitations/case-conferences', {
    params: { residentId },
    headers: getHeaders(),
  })
  return res.data
}

export async function createHomeVisitation(payload: {
  residentId: number
  date: string
  assessment: string
}): Promise<HomeVisitation> {
  const body = {
    residentId: payload.residentId,
    visitDate: payload.date,
    socialWorker: 'Unassigned',
    visitType: 'Home Visit',
    locationVisited: 'Not specified',
    familyMembersPresent: 'Not specified',
    purpose: 'Routine follow-up',
    observations: payload.assessment,
    familyCooperationLevel: 'Unknown',
    safetyConcernsNoted: false,
    followUpNeeded: false,
    followUpNotes: '',
    visitOutcome: 'Pending review',
  }
  const res = await api.post<HomeVisitation>('/api/home-visitations', body, { headers: getHeaders() })
  return res.data
}

export type Donation = {
  donationId: number
  supporterId: number
  donationDate: string
  amount: number
  estimatedValue?: number | null
  currencyCode?: string
  campaignName?: string | null
  notes?: string
  designation?: string
  paymentMethod?: string
  sourceChannel?: string
  donorSegment?: string
  campaignTag?: string
  fiscalYear?: number
  isRecurring?: boolean
}

export type PublicImpactSnapshot = {
  activeSafehouses?: number
  residentsSupported?: number
  totalDonationsBRL?: number
  totalDonationsUsd?: number
  totalDonors?: number
}

export type Supporter = {
  supporterId: number
  supporterType: string
  displayName: string
  organizationName?: string | null
  firstName?: string | null
  lastName?: string | null
  relationshipType: string
  region: string
  country: string
  email: string
  phone: string
  status: string
  firstDonationDate?: string | null
  acquisitionChannel: string
  createdAt?: string
}

export type SupporterDetail = Supporter & {
  donations?: Donation[]
}

export async function getDonations(page = 1, pageSize = 100): Promise<Donation[]> {
  const res = await api.get<{ items?: Donation[]; data?: Donation[] } | Donation[]>('/api/donations', {
    params: { page, pageSize },
    headers: getHeaders(),
  })
  if (Array.isArray(res.data)) return res.data
  return res.data.items ?? res.data.data ?? []
}

export async function getMyDonations(): Promise<Donation[]> {
  const res = await api.get<Donation[]>('/api/donations/me', { headers: getHeaders() })
  return Array.isArray(res.data) ? res.data : []
}

export async function getDonationsForSupporter(supporterId: number): Promise<Donation[]> {
  const res = await api.get<Donation[]>(`/api/donations/supporter/${supporterId}`, { headers: getHeaders() })
  return Array.isArray(res.data) ? res.data : []
}

export async function createMyDonation(payload: {
  amount: number
  campaignName?: string
  notes?: string
  isRecurring?: boolean
}): Promise<Donation> {
  const res = await api.post<Donation>(
    '/api/donations/me',
    {
      amount: payload.amount,
      campaignName: payload.campaignName ?? null,
      notes: payload.notes ?? null,
      isRecurring: payload.isRecurring ?? false,
    },
    { headers: getHeaders() }
  )
  return res.data
}

export async function getPublicImpactSnapshot(): Promise<PublicImpactSnapshot> {
  const res = await api.get<PublicImpactSnapshot>('/api/public/stats')
  return res.data
}

export async function getSupporterById(supporterId: number): Promise<SupporterDetail> {
  const res = await api.get<SupporterDetail>(`/api/supporters/${supporterId}`, { headers: getHeaders() })
  return res.data
}
