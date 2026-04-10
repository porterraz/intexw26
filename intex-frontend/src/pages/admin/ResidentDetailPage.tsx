import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  api,
  getHomeVisitationsPreview,
  getProcessRecordingsPreview,
  getResidentRecommendations,
  getResidentRelatedCounts,
  type ResidentMlRecommendations,
  type ResidentRelatedCounts,
} from '../../lib/api'
import { NavBar } from '../../components/NavBar'
import { ErrorMessage } from '../../components/ErrorMessage'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { useAuth } from '../../state/AuthContext'
import { formatDate, formatDateTime } from '../../lib/locale'

type Safehouse = { safehouseId: number; name: string }

type ResidentFormState = {
  caseControlNo: string
  internalCode: string
  safehouseId: string
  caseStatus: string
  sex: string
  dateOfBirth: string
  birthStatus: string
  placeOfBirth: string
  religion: string
  caseCategory: string
  referralSource: string
  assignedSocialWorker: string
  initialCaseAssessment: string
  initialRiskLevel: string
  currentRiskLevel: string
  dateOfAdmission: string
  dateEnrolled: string
  notesRestricted: string
}

const PUT_OMIT_KEYS = new Set([
  'safehouse',
  'processRecordings',
  'homeVisitations',
  'educationRecords',
  'healthWellbeingRecords',
  'incidentReports',
  'interventionPlans',
])

function isoToDateInput(value: unknown): string {
  if (value == null || value === '') return ''
  const s = String(value)
  if (s.length >= 10) return s.slice(0, 10)
  return s
}

function mapResidentToForm(r: Record<string, unknown>): ResidentFormState {
  return {
    caseControlNo: String(r.caseControlNo ?? ''),
    internalCode: String(r.internalCode ?? ''),
    safehouseId: String(r.safehouseId ?? ''),
    caseStatus: String(r.caseStatus ?? ''),
    sex: String(r.sex ?? ''),
    dateOfBirth: isoToDateInput(r.dateOfBirth),
    birthStatus: String(r.birthStatus ?? ''),
    placeOfBirth: String(r.placeOfBirth ?? ''),
    religion: String(r.religion ?? ''),
    caseCategory: String(r.caseCategory ?? ''),
    referralSource: String(r.referralSource ?? ''),
    assignedSocialWorker: String(r.assignedSocialWorker ?? ''),
    initialCaseAssessment: String(r.initialCaseAssessment ?? ''),
    initialRiskLevel: String(r.initialRiskLevel ?? ''),
    currentRiskLevel: String(r.currentRiskLevel ?? ''),
    dateOfAdmission: isoToDateInput(r.dateOfAdmission),
    dateEnrolled: isoToDateInput(r.dateEnrolled),
    notesRestricted: r.notesRestricted == null ? '' : String(r.notesRestricted),
  }
}

function buildPutPayload(base: Record<string, unknown>, form: ResidentFormState): Record<string, unknown> {
  const payload: Record<string, unknown> = { ...base }
  for (const k of PUT_OMIT_KEYS) delete payload[k]

  Object.assign(payload, {
    caseControlNo: form.caseControlNo.trim(),
    internalCode: form.internalCode.trim(),
    safehouseId: Number(form.safehouseId),
    caseStatus: form.caseStatus.trim(),
    sex: form.sex.trim(),
    dateOfBirth: form.dateOfBirth,
    birthStatus: form.birthStatus.trim(),
    placeOfBirth: form.placeOfBirth.trim(),
    religion: form.religion.trim(),
    caseCategory: form.caseCategory.trim(),
    referralSource: form.referralSource.trim(),
    assignedSocialWorker: form.assignedSocialWorker.trim(),
    initialCaseAssessment: form.initialCaseAssessment.trim(),
    initialRiskLevel: form.initialRiskLevel.trim(),
    currentRiskLevel: form.currentRiskLevel.trim(),
    dateOfAdmission: form.dateOfAdmission,
    dateEnrolled: form.dateEnrolled,
    notesRestricted: form.notesRestricted.trim() || null,
  })
  payload.residentId = base.residentId
  return payload
}

function pickField(obj: Record<string, unknown>, key: string): unknown {
  if (key in obj) return obj[key]
  const pascal = key.charAt(0).toUpperCase() + key.slice(1)
  if (pascal in obj) return (obj as Record<string, unknown>)[pascal]
  return undefined
}

function fmtBool(v: unknown): string {
  if (v === true) return 'Yes'
  if (v === false) return 'No'
  return '—'
}

function fmtText(v: unknown): string {
  if (v == null) return '—'
  const s = String(v).trim()
  return s.length ? s : '—'
}

/** Compares this resident's score to the mean of all scores in the model output file. */
function riskVersusAverageSentence(score: number, average: number): string {
  const avgFmt = average.toFixed(4)
  const suffix = ` (${avgFmt})`
  const diff = score - average
  if (Math.abs(diff) < 1e-9) {
    return `This score is about the same as the average risk score${suffix}.`
  }
  if (diff > 0) return `This score is higher than the average risk score${suffix}.`
  return `This score is lower than the average risk score${suffix}.`
}

function fmtDateValue(v: unknown, language: string | undefined): string {
  if (v == null || v === '') return '—'
  const d = new Date(String(v))
  if (Number.isNaN(d.getTime())) return fmtText(v)
  return formatDate(d, language)
}

function fmtDateTimeValue(v: unknown, language: string | undefined): string {
  if (v == null || v === '') return '—'
  const d = new Date(String(v))
  if (Number.isNaN(d.getTime())) return fmtText(v)
  return formatDateTime(d, language)
}

function DlRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="border-b border-slate-100 py-2.5 text-xs font-semibold uppercase tracking-wide text-surface-text sm:pt-3">
        {label}
      </dt>
      <dd className="border-b border-slate-100 py-2.5 text-sm text-surface-dark sm:pt-3">{children}</dd>
    </>
  )
}

function ProfileSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-surface-dark">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  )
}

function emptyRelatedCounts(): ResidentRelatedCounts {
  return {
    educationRecords: 0,
    healthWellbeingRecords: 0,
    incidentReports: 0,
    interventionPlans: 0,
  }
}

function ResidentProfilePanel({
  resident,
  language,
  residentId,
  recordingsPreview,
  visitationsPreview,
  relatedCounts,
  activityLoading,
}: {
  resident: Record<string, unknown>
  language?: string
  residentId: number
  recordingsPreview: { items: Record<string, unknown>[]; totalCount: number }
  visitationsPreview: { items: Record<string, unknown>[]; totalCount: number }
  relatedCounts: ResidentRelatedCounts
  activityLoading: boolean
}) {
  const r = resident
  const sh = pickField(r, 'safehouse')
  const safehouseObj =
    sh !== null && typeof sh === 'object' && !Array.isArray(sh) ? (sh as Record<string, unknown>) : null

  const recentProcess = recordingsPreview.items
  const recentVisits = visitationsPreview.items

  const booleanRows: { key: string; label: string }[] = [
    { key: 'subCatTrafficked', label: 'Subcategory: Trafficked' },
    { key: 'subCatPhysicalAbuse', label: 'Subcategory: Physical abuse' },
    { key: 'subCatSexualAbuse', label: 'Subcategory: Sexual abuse' },
    { key: 'subCatOsaec', label: 'Subcategory: OSAEC' },
    { key: 'subCatChildLabor', label: 'Subcategory: Child labor' },
    { key: 'subCatOrphaned', label: 'Subcategory: Orphaned' },
    { key: 'subCatCicl', label: 'Subcategory: CICL' },
    { key: 'subCatAtRisk', label: 'Subcategory: At risk' },
    { key: 'subCatStreetChild', label: 'Subcategory: Street child' },
    { key: 'subCatChildWithHiv', label: 'Subcategory: Child with HIV' },
    { key: 'familyIs4ps', label: 'Family: 4Ps beneficiary' },
    { key: 'familySoloParent', label: 'Family: Solo parent household' },
    { key: 'familyIndigenous', label: 'Family: Indigenous' },
    { key: 'familyParentPwd', label: 'Family: Parent PWD' },
    { key: 'familyInformalSettler', label: 'Family: Informal settler' },
  ]

  const dlGrid = 'grid grid-cols-1 gap-x-4 sm:grid-cols-[minmax(160px,240px)_1fr]'

  return (
    <div className="mt-6 space-y-6">
      <p className="rounded-lg border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-surface-text">
        Everything on this page is for <span className="font-semibold text-surface-dark">resident #{residentId}</span>{' '}
        only. Session and visitation rows repeat that ID so you can confirm they belong to this case. Full histories
        stay on the workflow pages linked below so this screen stays readable.
      </p>

      <ProfileSection title="Case & identification">
        <dl className={dlGrid}>
          <DlRow label="Resident ID">{fmtText(pickField(r, 'residentId'))}</DlRow>
          <DlRow label="Case control no.">{fmtText(pickField(r, 'caseControlNo'))}</DlRow>
          <DlRow label="Internal code">{fmtText(pickField(r, 'internalCode'))}</DlRow>
          <DlRow label="Safehouse ID">{fmtText(pickField(r, 'safehouseId'))}</DlRow>
          <DlRow label="Case status">{fmtText(pickField(r, 'caseStatus'))}</DlRow>
          <DlRow label="Case category">{fmtText(pickField(r, 'caseCategory'))}</DlRow>
          <DlRow label="Initial risk level">{fmtText(pickField(r, 'initialRiskLevel'))}</DlRow>
          <DlRow label="Current risk level">{fmtText(pickField(r, 'currentRiskLevel'))}</DlRow>
          <DlRow label="Date enrolled">{fmtDateValue(pickField(r, 'dateEnrolled'), language)}</DlRow>
          <DlRow label="Date closed">{fmtDateValue(pickField(r, 'dateClosed'), language)}</DlRow>
          <DlRow label="Record created">{fmtDateTimeValue(pickField(r, 'createdAt'), language)}</DlRow>
        </dl>
      </ProfileSection>

      <ProfileSection title="Current placement (facility)">
        {safehouseObj ? (
          <dl className={dlGrid}>
            <DlRow label="Name">{fmtText(pickField(safehouseObj, 'name'))}</DlRow>
            <DlRow label="Code">{fmtText(pickField(safehouseObj, 'safehouseCode'))}</DlRow>
            <DlRow label="Region / city">
              {[fmtText(pickField(safehouseObj, 'region')), fmtText(pickField(safehouseObj, 'city'))]
                .filter((x) => x !== '—')
                .join(', ') || '—'}
            </DlRow>
            <DlRow label="Province / country">
              {[fmtText(pickField(safehouseObj, 'province')), fmtText(pickField(safehouseObj, 'country'))]
                .filter((x) => x !== '—')
                .join(', ') || '—'}
            </DlRow>
            <DlRow label="Status">{fmtText(pickField(safehouseObj, 'status'))}</DlRow>
          </dl>
        ) : (
          <p className="text-sm text-surface-text">No facility details were returned with this record.</p>
        )}
      </ProfileSection>

      <ProfileSection title="Demographics">
        <dl className={dlGrid}>
          <DlRow label="Sex">{fmtText(pickField(r, 'sex'))}</DlRow>
          <DlRow label="Date of birth">{fmtDateValue(pickField(r, 'dateOfBirth'), language)}</DlRow>
          <DlRow label="Birth status">{fmtText(pickField(r, 'birthStatus'))}</DlRow>
          <DlRow label="Place of birth">{fmtText(pickField(r, 'placeOfBirth'))}</DlRow>
          <DlRow label="Religion">{fmtText(pickField(r, 'religion'))}</DlRow>
        </dl>
      </ProfileSection>

      <ProfileSection title="Case flags & circumstances">
        <details className="rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2">
          <summary className="cursor-pointer text-sm font-medium text-surface-dark">
            Subcategories, family circumstances, PWD / special needs (expand)
          </summary>
          <dl className={`${dlGrid} mt-3 border-t border-slate-200 pt-3`}>
            {booleanRows.map(({ key, label }) => (
              <DlRow key={key} label={label}>
                {fmtBool(pickField(r, key))}
              </DlRow>
            ))}
            <DlRow label="PWD">{fmtBool(pickField(r, 'isPwd'))}</DlRow>
            <DlRow label="PWD type">{fmtText(pickField(r, 'pwdType'))}</DlRow>
            <DlRow label="Has special needs">{fmtBool(pickField(r, 'hasSpecialNeeds'))}</DlRow>
            <DlRow label="Special needs diagnosis">{fmtText(pickField(r, 'specialNeedsDiagnosis'))}</DlRow>
          </dl>
        </details>
      </ProfileSection>

      <ProfileSection title="Admission & stay">
        <dl className={dlGrid}>
          <DlRow label="Date of admission">{fmtDateValue(pickField(r, 'dateOfAdmission'), language)}</DlRow>
          <DlRow label="Age upon admission">{fmtText(pickField(r, 'ageUponAdmission'))}</DlRow>
          <DlRow label="Present age">{fmtText(pickField(r, 'presentAge'))}</DlRow>
          <DlRow label="Length of stay">{fmtText(pickField(r, 'lengthOfStay'))}</DlRow>
        </dl>
      </ProfileSection>

      <ProfileSection title="Referral & registration">
        <dl className={dlGrid}>
          <DlRow label="Referral source">{fmtText(pickField(r, 'referralSource'))}</DlRow>
          <DlRow label="Referring agency / person">{fmtText(pickField(r, 'referringAgencyPerson'))}</DlRow>
          <DlRow label="COLB registered">{fmtDateValue(pickField(r, 'dateColbRegistered'), language)}</DlRow>
          <DlRow label="COLB obtained">{fmtDateValue(pickField(r, 'dateColbObtained'), language)}</DlRow>
        </dl>
      </ProfileSection>

      <ProfileSection title="Social work & case narrative">
        <dl className={dlGrid}>
          <DlRow label="Assigned social worker">{fmtText(pickField(r, 'assignedSocialWorker'))}</DlRow>
          <DlRow label="Date case study prepared">{fmtDateValue(pickField(r, 'dateCaseStudyPrepared'), language)}</DlRow>
          <DlRow label="Initial case assessment">
            <span className="whitespace-pre-wrap break-words">{fmtText(pickField(r, 'initialCaseAssessment'))}</span>
          </DlRow>
          <DlRow label="Reintegration type">{fmtText(pickField(r, 'reintegrationType'))}</DlRow>
          <DlRow label="Reintegration status">{fmtText(pickField(r, 'reintegrationStatus'))}</DlRow>
          <DlRow label="Restricted notes">
            <span className="whitespace-pre-wrap break-words">{fmtText(pickField(r, 'notesRestricted'))}</span>
          </DlRow>
        </dl>
      </ProfileSection>

      <ProfileSection title="Process recordings">
        {activityLoading ? (
          <p className="text-sm text-surface-text">Loading session summary…</p>
        ) : (
          <p className="text-sm text-surface-text">
            <span className="font-semibold text-surface-dark">{recordingsPreview.totalCount}</span> session
            {recordingsPreview.totalCount === 1 ? '' : 's'} on file for this resident.
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            to={`/admin/process-recordings/${residentId}`}
            className="inline-flex rounded-md bg-brand px-3 py-2 text-xs font-semibold text-white hover:bg-brand-dark"
          >
            Open process recordings
          </Link>
        </div>
        {!activityLoading && recentProcess.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-surface-text">
              Most recent {recentProcess.length} (of {recordingsPreview.totalCount})
            </p>
            <table className="w-full min-w-[520px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-surface-text">
                  <th className="py-2 pr-3 font-medium">Date</th>
                  <th className="py-2 pr-3 font-medium">Type</th>
                  <th className="py-2 pr-3 font-medium">Social worker</th>
                  <th className="py-2 font-medium">Minutes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentProcess.map((rec, idx) => (
                  <tr key={String(rec.recordingId ?? rec.RecordingId ?? idx)}>
                    <td className="py-2 pr-3 text-surface-text">
                      {fmtDateTimeValue(rec.sessionDate ?? rec.SessionDate, language)}
                    </td>
                    <td className="py-2 pr-3">{fmtText(rec.sessionType ?? rec.SessionType)}</td>
                    <td className="py-2 pr-3">{fmtText(rec.socialWorker ?? rec.SocialWorker)}</td>
                    <td className="py-2">{fmtText(rec.sessionDurationMinutes ?? rec.SessionDurationMinutes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : !activityLoading ? (
          <p className="mt-3 text-sm text-surface-text">No process recordings on file.</p>
        ) : null}
      </ProfileSection>

      <ProfileSection title="Home visitations">
        {activityLoading ? (
          <p className="text-sm text-surface-text">Loading visitation summary…</p>
        ) : (
          <p className="text-sm text-surface-text">
            <span className="font-semibold text-surface-dark">{visitationsPreview.totalCount}</span> visitation
            {visitationsPreview.totalCount === 1 ? '' : 's'} on file for this resident.
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            to={`/admin/visitations/${residentId}`}
            className="inline-flex rounded-md border border-brand-100 px-3 py-2 text-xs font-semibold text-surface-dark hover:bg-brand-50"
          >
            Open visitations
          </Link>
        </div>
        {!activityLoading && recentVisits.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-surface-text">
              Most recent {recentVisits.length} (of {visitationsPreview.totalCount})
            </p>
            <table className="w-full min-w-[560px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-surface-text">
                  <th className="py-2 pr-3 font-medium">Date</th>
                  <th className="py-2 pr-3 font-medium">Type</th>
                  <th className="py-2 pr-3 font-medium">Location</th>
                  <th className="py-2 font-medium">Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentVisits.map((v, idx) => (
                  <tr key={String(v.visitationId ?? v.VisitationId ?? idx)}>
                    <td className="py-2 pr-3 text-surface-text">
                      {fmtDateTimeValue(v.visitDate ?? v.VisitDate, language)}
                    </td>
                    <td className="py-2 pr-3">{fmtText(v.visitType ?? v.VisitType)}</td>
                    <td className="py-2 pr-3">{fmtText(v.locationVisited ?? v.LocationVisited)}</td>
                    <td className="py-2">{fmtText(v.visitOutcome ?? v.VisitOutcome)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : !activityLoading ? (
          <p className="mt-3 text-sm text-surface-text">No home visitations on file.</p>
        ) : null}
      </ProfileSection>

      <ProfileSection title="Other linked records">
        {activityLoading ? (
          <p className="text-sm text-surface-text">Loading record counts…</p>
        ) : (
          <p className="text-sm text-surface-text">
            Education: <span className="font-medium text-surface-dark">{relatedCounts.educationRecords}</span>
            {' · '}
            Health &amp; wellbeing:{' '}
            <span className="font-medium text-surface-dark">{relatedCounts.healthWellbeingRecords}</span>
            {' · '}
            Incident reports: <span className="font-medium text-surface-dark">{relatedCounts.incidentReports}</span>
            {' · '}
            Intervention plans: <span className="font-medium text-surface-dark">{relatedCounts.interventionPlans}</span>
          </p>
        )}
        {!activityLoading &&
        relatedCounts.educationRecords +
          relatedCounts.healthWellbeingRecords +
          relatedCounts.incidentReports +
          relatedCounts.interventionPlans >
          0 ? (
          <p className="mt-2 text-xs text-surface-text">
            Detailed rows for these types are omitted here to keep the profile short. Use reporting or future dedicated
            screens if you need full entries.
          </p>
        ) : null}
      </ProfileSection>
    </div>
  )
}

export function ResidentDetailPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams()
  const { hasRole } = useAuth()
  const isAdmin = hasRole('Admin')
  const residentId = Number(id)

  const [resident, setResident] = useState<Record<string, unknown> | null>(null)
  const [residentLoading, setResidentLoading] = useState(true)
  const [residentLoadError, setResidentLoadError] = useState<string | null>(null)
  const [safehouses, setSafehouses] = useState<Safehouse[]>([])
  const [loadingSafehouses, setLoadingSafehouses] = useState(true)
  const [form, setForm] = useState<ResidentFormState | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [recommendations, setRecommendations] = useState<ResidentMlRecommendations | null>(null)
  const [recommendationsLoading, setRecommendationsLoading] = useState(false)
  const [recommendationsError, setRecommendationsError] = useState<string | null>(null)

  const [recordingsPreview, setRecordingsPreview] = useState<{
    items: Record<string, unknown>[]
    totalCount: number
  }>({ items: [], totalCount: 0 })
  const [visitationsPreview, setVisitationsPreview] = useState<{
    items: Record<string, unknown>[]
    totalCount: number
  }>({ items: [], totalCount: 0 })
  const [relatedCounts, setRelatedCounts] = useState<ResidentRelatedCounts>(emptyRelatedCounts())
  const [activityLoading, setActivityLoading] = useState(false)

  function updateForm<K extends keyof ResidentFormState>(key: K, value: ResidentFormState[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await api.get<Safehouse[]>('/api/safehouses')
        if (!cancelled) setSafehouses(res.data)
      } catch {
        if (!cancelled) setSafehouses([])
      } finally {
        if (!cancelled) setLoadingSafehouses(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!Number.isFinite(residentId)) {
      setResidentLoading(false)
      setActivityLoading(false)
      setResidentLoadError(t('resident_detail_load_error'))
      return
    }
    let cancelled = false
    ;(async () => {
      setResidentLoadError(null)
      setResidentLoading(true)
      setActivityLoading(true)
      setRecordingsPreview({ items: [], totalCount: 0 })
      setVisitationsPreview({ items: [], totalCount: 0 })
      setRelatedCounts(emptyRelatedCounts())

      const safe = <T,>(p: Promise<T>, fb: T) => p.catch(() => fb)

      try {
        const main = await api.get<Record<string, unknown>>(`/api/residents/${residentId}`)
        if (cancelled) return
        setResident(main.data)
        setForm(mapResidentToForm(main.data))
      } catch {
        if (!cancelled) {
          setResident(null)
          setForm(null)
          setResidentLoadError(t('resident_detail_load_error'))
          setActivityLoading(false)
        }
        return
      } finally {
        if (!cancelled) setResidentLoading(false)
      }

      if (cancelled) {
        setActivityLoading(false)
        return
      }

      try {
        const [rec, vis, cnt] = await Promise.all([
          safe(getProcessRecordingsPreview(residentId, 5), { items: [], totalCount: 0 }),
          safe(getHomeVisitationsPreview(residentId, 5), { items: [], totalCount: 0 }),
          safe(getResidentRelatedCounts(residentId), emptyRelatedCounts()),
        ])
        if (cancelled) return
        setRecordingsPreview({
          items: rec.items as Record<string, unknown>[],
          totalCount: rec.totalCount,
        })
        setVisitationsPreview({
          items: vis.items as Record<string, unknown>[],
          totalCount: vis.totalCount,
        })
        setRelatedCounts(cnt)
      } finally {
        if (!cancelled) setActivityLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [residentId, t])

  useEffect(() => {
    let active = true

    async function loadRecommendations() {
      if (!Number.isFinite(residentId)) return
      setRecommendationsLoading(true)
      setRecommendationsError(null)

      try {
        const data = await getResidentRecommendations(residentId)
        if (!active) return
        setRecommendations(data)
      } catch {
        if (!active) return
        setRecommendationsError('Unable to load AI matches right now.')
      } finally {
        if (active) setRecommendationsLoading(false)
      }
    }

    void loadRecommendations()
    return () => {
      active = false
    }
  }, [residentId])

  function handleStartEdit() {
    if (!resident) return
    if (!window.confirm(t('resident_detail_confirm_edit'))) return
    setSaveError(null)
    setForm(mapResidentToForm(resident))
    setIsEditing(true)
  }

  function handleCancelEdit() {
    if (!window.confirm(t('resident_detail_confirm_discard'))) return
    if (resident) setForm(mapResidentToForm(resident))
    setSaveError(null)
    setIsEditing(false)
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    if (!resident || !form) return
    if (!window.confirm(t('resident_detail_confirm_save'))) return
    setSaveError(null)
    setSaving(true)
    try {
      const payload = buildPutPayload(resident, form)
      await api.put(`/api/residents/${residentId}`, payload)
      const safe = <T,>(p: Promise<T>, fb: T) => p.catch(() => fb)
      const [main, rec, vis, cnt] = await Promise.all([
        api.get<Record<string, unknown>>(`/api/residents/${residentId}`),
        safe(getProcessRecordingsPreview(residentId, 5), { items: [], totalCount: 0 }),
        safe(getHomeVisitationsPreview(residentId, 5), { items: [], totalCount: 0 }),
        safe(getResidentRelatedCounts(residentId), emptyRelatedCounts()),
      ])
      setResident(main.data)
      setForm(mapResidentToForm(main.data))
      setRecordingsPreview({
        items: rec.items as Record<string, unknown>[],
        totalCount: rec.totalCount,
      })
      setVisitationsPreview({
        items: vis.items as Record<string, unknown>[],
        totalCount: vis.totalCount,
      })
      setRelatedCounts(cnt)
      setIsEditing(false)
    } catch {
      setSaveError(t('resident_detail_save_error'))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm(t('resident_detail_confirm_delete'))) return
    setDeleteError(null)
    setDeleting(true)
    try {
      await api.delete(`/api/residents/${residentId}`, { params: { confirm: true } })
      navigate('/admin/residents')
    } catch {
      setDeleteError(t('resident_detail_delete_error'))
    } finally {
      setDeleting(false)
    }
  }

  const invalidId = !Number.isFinite(residentId)

  return (
    <div className="min-h-full text-surface-dark">
      <NavBar />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Link to="/admin/residents" className="text-sm font-semibold text-surface-text hover:text-surface-dark">
          ← {t('resident_detail_back')}
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-surface-dark">Resident Detail</h1>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <span className="text-sm text-surface-text">
            ResidentId: {invalidId ? '—' : id}
          </span>
          {isAdmin && resident && !residentLoading && !residentLoadError ? (
            <>
              {!isEditing ? (
                <button
                  type="button"
                  onClick={handleStartEdit}
                  className="rounded-md border border-brand-100 bg-surface px-3 py-1.5 text-sm font-semibold text-surface-dark hover:bg-brand-50"
                >
                  {t('resident_detail_edit')}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={deleting || saving}
                className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                {deleting ? '…' : t('resident_detail_delete')}
              </button>
            </>
          ) : null}
        </div>
        {deleteError ? <div className="mt-2"><ErrorMessage message={deleteError} /></div> : null}

        {isEditing && form && resident ? (
          <form
            onSubmit={(e) => void handleSave(e)}
            className="mt-6 rounded-2xl border border-brand-100 bg-surface p-5 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-surface-dark">{t('resident_detail_editing_title')}</h2>
            {saveError ? (
              <div className="mt-3">
                <ErrorMessage message={saveError} />
              </div>
            ) : null}
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <input
                id="resident-edit-caseControlNo"
                name="caseControlNo"
                value={form.caseControlNo}
                onChange={(e) => updateForm('caseControlNo', e.target.value)}
                placeholder="Case Control No"
                required
                className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
              />
              <input
                id="resident-edit-internalCode"
                name="internalCode"
                value={form.internalCode}
                onChange={(e) => updateForm('internalCode', e.target.value)}
                placeholder="Internal Code"
                required
                className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
              />
              <select
                id="resident-edit-safehouseId"
                name="safehouseId"
                value={form.safehouseId}
                onChange={(e) => updateForm('safehouseId', e.target.value)}
                disabled={loadingSafehouses || safehouses.length === 0}
                className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
              >
                {safehouses.length === 0 ? (
                  <option value="">No safehouses available</option>
                ) : (
                  safehouses.map((s) => (
                    <option key={s.safehouseId} value={String(s.safehouseId)}>
                      {s.name}
                    </option>
                  ))
                )}
              </select>
              <input
                id="resident-edit-caseStatus"
                name="caseStatus"
                value={form.caseStatus}
                onChange={(e) => updateForm('caseStatus', e.target.value)}
                placeholder="Case Status"
                required
                className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
              />
              <input
                id="resident-edit-caseCategory"
                name="caseCategory"
                value={form.caseCategory}
                onChange={(e) => updateForm('caseCategory', e.target.value)}
                placeholder="Case Category"
                required
                className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
              />
              <input
                id="resident-edit-sex"
                name="sex"
                value={form.sex}
                onChange={(e) => updateForm('sex', e.target.value)}
                placeholder="Sex"
                required
                className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
              />
              <input
                id="resident-edit-dateOfBirth"
                name="dateOfBirth"
                value={form.dateOfBirth}
                onChange={(e) => updateForm('dateOfBirth', e.target.value)}
                type="date"
                required
                className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
              />
              <input
                id="resident-edit-birthStatus"
                name="birthStatus"
                value={form.birthStatus}
                onChange={(e) => updateForm('birthStatus', e.target.value)}
                placeholder="Birth Status"
                required
                className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
              />
              <input
                id="resident-edit-placeOfBirth"
                name="placeOfBirth"
                value={form.placeOfBirth}
                onChange={(e) => updateForm('placeOfBirth', e.target.value)}
                placeholder="Place of Birth"
                required
                className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
              />
              <input
                id="resident-edit-religion"
                name="religion"
                value={form.religion}
                onChange={(e) => updateForm('religion', e.target.value)}
                placeholder="Religion"
                required
                className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
              />
              <input
                id="resident-edit-referralSource"
                name="referralSource"
                value={form.referralSource}
                onChange={(e) => updateForm('referralSource', e.target.value)}
                placeholder="Referral Source"
                required
                className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
              />
              <input
                id="resident-edit-assignedSocialWorker"
                name="assignedSocialWorker"
                value={form.assignedSocialWorker}
                onChange={(e) => updateForm('assignedSocialWorker', e.target.value)}
                placeholder="Assigned Social Worker"
                required
                className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
              />
              <input
                id="resident-edit-initialRiskLevel"
                name="initialRiskLevel"
                value={form.initialRiskLevel}
                onChange={(e) => updateForm('initialRiskLevel', e.target.value)}
                placeholder="Initial Risk Level"
                required
                className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
              />
              <input
                id="resident-edit-currentRiskLevel"
                name="currentRiskLevel"
                value={form.currentRiskLevel}
                onChange={(e) => updateForm('currentRiskLevel', e.target.value)}
                placeholder="Current Risk Level"
                required
                className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
              />
              <input
                id="resident-edit-dateOfAdmission"
                name="dateOfAdmission"
                value={form.dateOfAdmission}
                onChange={(e) => updateForm('dateOfAdmission', e.target.value)}
                type="date"
                required
                className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
              />
              <input
                id="resident-edit-dateEnrolled"
                name="dateEnrolled"
                value={form.dateEnrolled}
                onChange={(e) => updateForm('dateEnrolled', e.target.value)}
                type="date"
                required
                className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
              />
              <textarea
                id="resident-edit-initialCaseAssessment"
                name="initialCaseAssessment"
                value={form.initialCaseAssessment}
                onChange={(e) => updateForm('initialCaseAssessment', e.target.value)}
                placeholder="Initial Case Assessment"
                required
                rows={3}
                className="md:col-span-2 rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
              />
              <textarea
                id="resident-edit-notesRestricted"
                name="notesRestricted"
                value={form.notesRestricted}
                onChange={(e) => updateForm('notesRestricted', e.target.value)}
                placeholder="Restricted Notes (optional)"
                rows={2}
                className="md:col-span-2 rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
              />
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving || loadingSafehouses || safehouses.length === 0}
                className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
              >
                {saving ? '…' : t('resident_detail_save_changes')}
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={saving}
                className="rounded-md border border-brand-100 px-4 py-2 text-sm font-semibold hover:bg-brand-50 disabled:opacity-50"
              >
                {t('resident_detail_cancel_edit')}
              </button>
            </div>
          </form>
        ) : null}

        {!invalidId && !isEditing ? (
          <>
            <div className="mt-6 rounded-2xl border border-brand-100 bg-surface p-5 shadow-sm">
              <div className="text-sm text-surface-text">Resident workflow actions</div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  to={`/admin/process-recordings/${id}`}
                  className="inline-flex items-center rounded-md bg-brand px-3 py-2 text-xs font-semibold text-white hover:bg-brand-dark"
                >
                  Open Process Recordings
                </Link>
                <Link
                  to={`/admin/visitations/${id}`}
                  className="inline-flex items-center rounded-md border border-brand-100 px-3 py-2 text-xs font-semibold text-surface-dark hover:bg-brand-50"
                >
                  Open Visitations
                </Link>
              </div>
            </div>

            <section className="mt-6 rounded-2xl border border-slate-200 bg-surface p-5 shadow-sm">
              {recommendationsLoading ? (
                <p className="text-sm text-surface-text">Loading resident risk score...</p>
              ) : recommendationsError ? (
                <p className="text-sm text-red-500">{recommendationsError}</p>
              ) : recommendations === null ? (
                <>
                  <p className="text-sm text-surface-text">
                    No recommendation data is available yet for this resident.
                  </p>
                  <p className="mt-2 text-sm text-surface-text">
                    When a score is available, it is created using our ML Pipelines.
                  </p>
                </>
              ) : recommendations.riskScore != null && Number.isFinite(recommendations.riskScore) ? (
                <>
                  <p className="text-2xl font-bold tabular-nums text-surface-dark">
                    <span className="font-semibold">Resident Risk Score:</span>{' '}
                    {recommendations.riskScore.toFixed(4)}
                  </p>
                  {recommendations.averageRiskScore != null &&
                  Number.isFinite(recommendations.averageRiskScore) ? (
                    <p className="mt-2 text-sm text-surface-text">
                      {riskVersusAverageSentence(
                        recommendations.riskScore,
                        recommendations.averageRiskScore
                      )}
                    </p>
                  ) : null}
                  <p className="mt-2 text-sm text-surface-text">
                    This score was created using our ML Pipelines.
                  </p>
                </>
              ) : recommendations.message ? (
                <>
                  <p className="text-sm text-surface-text">{recommendations.message}</p>
                  <p className="mt-2 text-sm text-surface-text">
                    Risk scores are produced using our ML Pipelines when available.
                  </p>
                </>
              ) : recommendations.peerMatches.length === 0 ? (
                <>
                  <p className="text-sm text-surface-text">No peer matches were found for this resident.</p>
                  <p className="mt-2 text-sm text-surface-text">
                    Risk scores are produced using our ML Pipelines when available.
                  </p>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    {recommendations.peerMatches.map((match) => (
                      <div
                        key={match.matchId}
                        className="rounded-lg border border-brand-100 bg-brand-50 px-3 py-2 text-sm text-surface-dark"
                      >
                        <div className="font-medium">Resident #{match.matchId}</div>
                        <div className="mt-0.5 text-xs text-surface-text">
                          Similarity: {match.similarityScore.toFixed(2)} · {match.matchReason}
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-sm text-surface-text">
                    Peer matches are generated using our ML Pipelines.
                  </p>
                </>
              )}
            </section>

            <section className="mt-6 rounded-2xl border border-slate-200 bg-surface p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-surface-dark">Intervention Recommendations</h2>
              <p className="mt-1 text-sm text-surface-text">
                Data-driven intervention guidance based on wellbeing trajectory and incident risk models.
              </p>

              {recommendationsLoading ? (
                <p className="mt-4 text-sm text-surface-text">Loading intervention recommendations...</p>
              ) : recommendationsError ? (
                <p className="mt-4 text-sm text-red-500">{recommendationsError}</p>
              ) : recommendations === null ? (
                <p className="mt-4 text-sm text-surface-text">
                  No intervention recommendation data is available yet for this resident.
                </p>
              ) : recommendations.recommendedIntervention ? (
                <div className="mt-4 space-y-4">
                  {recommendations.reviewRequired && (
                    <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
                      <span>Requires Manual Review</span>
                    </div>
                  )}
                  <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-4">
                    <div className="flex items-baseline justify-between">
                      <span className="text-base font-semibold text-surface-dark">
                        Recommended: {recommendations.recommendedIntervention}
                      </span>
                    </div>
                    {recommendations.incidentRisk != null && Number.isFinite(recommendations.incidentRisk) && (
                      <p className="mt-2 text-xs text-surface-text">
                        30-day incident risk: {(recommendations.incidentRisk * 100).toFixed(0)}%
                      </p>
                    )}
                  </div>
                  {recommendations.topDrivers && recommendations.topDrivers.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-surface-text">Top drivers for this recommendation:</p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {recommendations.topDrivers.map((driver) => (
                          <span
                            key={driver}
                            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs text-surface-dark"
                          >
                            {driver.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-surface-text">
                    Generated by the Resident Intervention Recommender pipeline.
                  </p>
                </div>
              ) : recommendations.suggestedInterventions.length === 0 ? (
                <p className="mt-4 text-sm text-surface-text">No intervention recommendations were found.</p>
              ) : (
                <div className="mt-4 flex flex-wrap gap-2">
                  {recommendations.suggestedInterventions.map((intervention) => (
                    <span
                      key={intervention}
                      className="inline-flex items-center rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-surface-dark"
                    >
                      {intervention}
                    </span>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : null}

        {residentLoading ? (
          <LoadingSpinner />
        ) : residentLoadError ? (
          <div className="mt-4">
            <ErrorMessage message={residentLoadError} />
          </div>
        ) : null}

        {resident && !residentLoading && !residentLoadError && !isEditing ? (
          <ResidentProfilePanel
            resident={resident}
            language={i18n.resolvedLanguage}
            residentId={residentId}
            recordingsPreview={recordingsPreview}
            visitationsPreview={visitationsPreview}
            relatedCounts={relatedCounts}
            activityLoading={activityLoading}
          />
        ) : null}
      </main>
    </div>
  )
}
