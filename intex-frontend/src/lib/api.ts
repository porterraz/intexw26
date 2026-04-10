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

export type ForgotPasswordApiResponse = {
  success: boolean
  resetToken?: string | null
}

export async function requestPasswordReset(email: string): Promise<ForgotPasswordApiResponse> {
  const res = await api.post<ForgotPasswordApiResponse>('/api/auth/forgot-password', { email })
  return res.data
}

export async function resetPasswordRequest(email: string, newPassword: string, token?: string): Promise<{ success?: boolean }> {
  const res = await api.post<{ success?: boolean }>('/api/auth/reset-password', {
    email,
    token: token ?? null,
    newPassword,
  })
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
  /** Model risk score from resident_recommendations.json (0–1 scale in sample data). */
  riskScore?: number | null
  /** Mean of all risk scores in the model output file (same scale as riskScore). */
  averageRiskScore?: number | null
  message?: string | null
  peerMatches: ResidentRecommendation[]
  suggestedInterventions: string[]
  /** Recommended intervention category from the intervention recommender pipeline. */
  recommendedIntervention?: string | null
  /** Model confidence in the recommendation (0–1). */
  confidence?: number | null
  /** Top features driving this recommendation. */
  topDrivers?: string[]
  /** Predicted probability of an incident in the next 30 days (0–1). */
  incidentRisk?: number | null
  /** Whether manual review is required (high/critical risk or high incident probability). */
  reviewRequired?: boolean
}

export async function getResidentRecommendations(id: number): Promise<ResidentMlRecommendations | null> {
  try {
    const res = await api.get<{
      residentId?: number
      modelUsed?: string
      riskScore?: number | null
      averageRiskScore?: number | null
      message?: string | null
      peerMatches?: ResidentRecommendation[]
      suggestedInterventions?: string[]
      recommendedResidentIds?: number[]
      recommendations?: number[]
      ids?: number[]
      recommendedIntervention?: string | null
      confidence?: number | null
      topDrivers?: string[]
      incidentRisk?: number | null
      reviewRequired?: boolean
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
      riskScore: res.data.riskScore ?? null,
      averageRiskScore:
        res.data.averageRiskScore != null && Number.isFinite(res.data.averageRiskScore)
          ? res.data.averageRiskScore
          : null,
      message: res.data.message ?? null,
      peerMatches,
      suggestedInterventions,
      recommendedIntervention: res.data.recommendedIntervention ?? null,
      confidence: res.data.confidence ?? null,
      topDrivers: Array.isArray(res.data.topDrivers) ? res.data.topDrivers : [],
      incidentRisk: res.data.incidentRisk ?? null,
      reviewRequired: res.data.reviewRequired ?? false,
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

export type ActivityPreview<T> = { items: T[]; totalCount: number }

export type ResidentRelatedCounts = {
  educationRecords: number
  healthWellbeingRecords: number
  incidentReports: number
  interventionPlans: number
}

export async function getProcessRecordingsPreview(
  residentId: number,
  take = 5
): Promise<ActivityPreview<ProcessRecording>> {
  const res = await api.get<ActivityPreview<ProcessRecording>>(
    `/api/process-recordings/resident/${residentId}/preview`,
    { params: { take } }
  )
  return res.data
}

export async function getHomeVisitationsPreview(
  residentId: number,
  take = 5
): Promise<ActivityPreview<HomeVisitation>> {
  const res = await api.get<ActivityPreview<HomeVisitation>>(
    `/api/home-visitations/resident/${residentId}/preview`,
    { params: { take } }
  )
  return res.data
}

export async function getResidentRelatedCounts(residentId: number): Promise<ResidentRelatedCounts> {
  const res = await api.get<ResidentRelatedCounts>(`/api/residents/${residentId}/related-counts`)
  return res.data
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

export async function updateProcessRecording(
  row: ProcessRecording,
  updates: { sessionDate: string; sessionNarrative: string }
): Promise<void> {
  const body = {
    ...row,
    sessionDate: updates.sessionDate,
    sessionNarrative: updates.sessionNarrative,
  }
  await api.put(`/api/process-recordings/${row.recordingId}`, body, { headers: getHeaders() })
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
  entryType?: 'Home Visitation' | 'Case Conference'
}): Promise<HomeVisitation> {
  const isConference = payload.entryType === 'Case Conference'
  const body = {
    residentId: payload.residentId,
    visitDate: payload.date,
    socialWorker: 'Unassigned',
    visitType: isConference ? 'Case Conference' : 'Home Visit',
    locationVisited: 'Not specified',
    familyMembersPresent: 'Not specified',
    purpose: isConference ? 'Case Conference Review' : 'Routine follow-up',
    observations: payload.assessment,
    familyCooperationLevel: 'Unknown',
    safetyConcernsNoted: false,
    followUpNeeded: false,
    followUpNotes: '',
    visitOutcome: isConference ? 'Conference logged' : 'Pending review',
  }
  const res = await api.post<HomeVisitation>('/api/home-visitations', body, { headers: getHeaders() })
  return res.data
}

export async function updateHomeVisitation(
  row: HomeVisitation,
  updates: { visitDate: string; observations: string; visitOutcome: string }
): Promise<void> {
  const body = {
    ...row,
    visitDate: updates.visitDate,
    observations: updates.observations,
    visitOutcome: updates.visitOutcome,
  }
  await api.put(`/api/home-visitations/${row.visitationId}`, body, { headers: getHeaders() })
}

export async function deleteHomeVisitation(visitationId: number): Promise<void> {
  await api.delete(`/api/home-visitations/${visitationId}`, {
    params: { confirm: true },
    headers: getHeaders(),
  })
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
  const res = await api.get<
    PublicImpactSnapshot & { totalGirlsServed?: number; TotalGirlsServed?: number }
  >('/api/public/stats')
  const d = res.data
  const fromApi = d.residentsSupported ?? d.totalGirlsServed ?? d.TotalGirlsServed
  const residentsSupported =
    typeof fromApi === 'number' && Number.isFinite(fromApi) ? fromApi : d.residentsSupported
  return { ...d, residentsSupported }
}

export async function getSupporterById(supporterId: number): Promise<SupporterDetail> {
  const res = await api.get<SupporterDetail>(`/api/supporters/${supporterId}`, { headers: getHeaders() })
  return res.data
}

export type DonorSegment = {
  supporterId: number
  persona?: string | null
  recency?: number
  frequency?: number
  monetary?: number
  cluster?: number
  message?: string | null
}

export async function getSupporterSegment(supporterId: number): Promise<DonorSegment | null> {
  try {
    const res = await api.get<DonorSegment>(`/api/supporters/${supporterId}/segment`, {
      headers: getHeaders(),
    })
    return res.data
  } catch {
    return null
  }
}

export type SegmentEntry = {
  persona?: string | null
  recency?: number
  frequency?: number
  monetary?: number
  cluster?: number
}

export async function getAllSegments(): Promise<Record<string, SegmentEntry>> {
  try {
    const res = await api.get<Record<string, SegmentEntry>>('/api/supporters/segments', {
      headers: getHeaders(),
    })
    return res.data
  } catch {
    return {}
  }
}
