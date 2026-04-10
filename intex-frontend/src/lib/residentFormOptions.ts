/** Default option lists for new resident form; merged with distinct values from the API. */

export const DEFAULT_CASE_STATUSES = ['Closed', 'Open', 'Pending', 'Transferred']

export const DEFAULT_CASE_CATEGORIES = [
  'Emergency Placement',
  'Protection',
  'Rehabilitative Care',
  'Reintegration',
  'Temporary Shelter',
]

export const SEX_OPTIONS = ['Female', 'Male', 'Intersex', 'Prefer not to say']

export const BIRTH_STATUS_OPTIONS = ['Late Registered', 'Registered', 'Unknown', 'Unregistered']

/** Philippine regions / common locality labels for place of birth. */
export const PLACE_OF_BIRTH_OPTIONS = [
  'BARMM',
  'CAR',
  'Metro Manila (NCR)',
  'Region I – Ilocos',
  'Region II – Cagayan Valley',
  'Region III – Central Luzon',
  'Region IV-A – CALABARZON',
  'Region IV-B – MIMAROPA',
  'Region V – Bicol',
  'Region VI – Western Visayas',
  'Region VII – Central Visayas',
  'Region VIII – Eastern Visayas',
  'Region IX – Zamboanga Peninsula',
  'Region X – Northern Mindanao',
  'Region XI – Davao',
  'Region XII – SOCCSKSARGEN',
  'Region XIII – Caraga',
  'Abroad / Foreign',
  'Not specified',
]

export const RELIGION_OPTIONS = [
  'Buddhism',
  'Hinduism',
  'Iglesia ni Cristo',
  'Indigenous / traditional beliefs',
  'Islam',
  'None',
  'Not specified',
  'Other Christian',
  'Protestant',
  'Roman Catholic',
]

export const REFERRAL_SOURCE_OPTIONS = [
  'Barangay',
  'Court / legal',
  'DSWD',
  'Family',
  'LGU',
  'NGO / CSO',
  'Police / law enforcement',
  'Self-referral',
  'Other agency',
]

export const RISK_LEVEL_OPTIONS = ['Low', 'Medium', 'High', 'Critical']

export const DEFAULT_SOCIAL_WORKER_LABELS = [
  'Center social worker (rotating)',
  'DSWD field office',
  'On-call social worker',
]

export function mergeDistinctOptions(apiValues: string[], defaults: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  const add = (s: string) => {
    const t = s.trim()
    if (!t) return
    const key = t.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    out.push(t)
  }
  for (const d of defaults) add(d)
  for (const a of apiValues) add(a)
  out.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
  return out
}
