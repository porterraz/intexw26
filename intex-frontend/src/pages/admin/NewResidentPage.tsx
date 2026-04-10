import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ErrorMessage } from '../../components/ErrorMessage'
import { NavBar } from '../../components/NavBar'
import { api } from '../../lib/api'
import {
  BIRTH_STATUS_OPTIONS,
  DEFAULT_CASE_CATEGORIES,
  DEFAULT_CASE_STATUSES,
  DEFAULT_SOCIAL_WORKER_LABELS,
  mergeDistinctOptions,
  PLACE_OF_BIRTH_OPTIONS,
  REFERRAL_SOURCE_OPTIONS,
  RELIGION_OPTIONS,
  RISK_LEVEL_OPTIONS,
  SEX_OPTIONS,
} from '../../lib/residentFormOptions'

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

export function NewResidentPage() {
  const navigate = useNavigate()
  const [safehouses, setSafehouses] = useState<Safehouse[]>([])
  const [loadingSafehouses, setLoadingSafehouses] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadingResidentDefaults, setLoadingResidentDefaults] = useState(true)
  const [caseStatusOptions, setCaseStatusOptions] = useState<string[]>(DEFAULT_CASE_STATUSES)
  const [caseCategoryOptions, setCaseCategoryOptions] = useState<string[]>(DEFAULT_CASE_CATEGORIES)
  const [socialWorkerOptions, setSocialWorkerOptions] = useState<string[]>(DEFAULT_SOCIAL_WORKER_LABELS)
  const [loadingFieldOptions, setLoadingFieldOptions] = useState(true)
  const [form, setForm] = useState<ResidentFormState>({
    caseControlNo: '',
    internalCode: '',
    safehouseId: '',
    caseStatus: 'Open',
    sex: 'Female',
    dateOfBirth: '',
    birthStatus: 'Registered',
    placeOfBirth: 'Not specified',
    religion: 'Not specified',
    caseCategory: 'Protection',
    referralSource: 'DSWD',
    assignedSocialWorker: DEFAULT_SOCIAL_WORKER_LABELS[0] ?? '',
    initialCaseAssessment: '',
    initialRiskLevel: 'Medium',
    currentRiskLevel: 'Medium',
    dateOfAdmission: '',
    dateEnrolled: '',
    notesRestricted: '',
  })

  function update<K extends keyof ResidentFormState>(key: K, value: ResidentFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await api.get<Safehouse[]>('/api/safehouses')
        if (!cancelled) {
          setSafehouses(res.data)
          if (res.data.length > 0) {
            setForm((prev) => ({ ...prev, safehouseId: prev.safehouseId || String(res.data[0].safehouseId) }))
          }
        }
      } catch {
        if (!cancelled) setError('Unable to load safehouses.')
      } finally {
        if (!cancelled) setLoadingSafehouses(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoadingFieldOptions(true)
    ;(async () => {
      try {
        const [statusRes, catRes, swRes] = await Promise.allSettled([
          api.get<string[]>('/api/residents/case-statuses'),
          api.get<string[]>('/api/residents/case-categories'),
          api.get<string[]>('/api/residents/social-workers'),
        ])
        if (cancelled) return

        const statuses =
          statusRes.status === 'fulfilled' && Array.isArray(statusRes.value.data)
            ? mergeDistinctOptions(statusRes.value.data, DEFAULT_CASE_STATUSES)
            : DEFAULT_CASE_STATUSES
        const categories =
          catRes.status === 'fulfilled' && Array.isArray(catRes.value.data)
            ? mergeDistinctOptions(catRes.value.data, DEFAULT_CASE_CATEGORIES)
            : DEFAULT_CASE_CATEGORIES
        const workers =
          swRes.status === 'fulfilled' && Array.isArray(swRes.value.data)
            ? mergeDistinctOptions(swRes.value.data, DEFAULT_SOCIAL_WORKER_LABELS)
            : DEFAULT_SOCIAL_WORKER_LABELS

        setCaseStatusOptions(statuses)
        setCaseCategoryOptions(categories)
        setSocialWorkerOptions(workers)

        setForm((prev) => ({
          ...prev,
          caseStatus: statuses.includes(prev.caseStatus) ? prev.caseStatus : statuses[0] ?? prev.caseStatus,
          caseCategory: categories.includes(prev.caseCategory)
            ? prev.caseCategory
            : categories[0] ?? prev.caseCategory,
          assignedSocialWorker:
            workers.includes(prev.assignedSocialWorker.trim()) && prev.assignedSocialWorker.trim()
              ? prev.assignedSocialWorker
              : workers[0] ?? prev.assignedSocialWorker,
        }))
      } catch {
        /* keep defaults */
      } finally {
        if (!cancelled) setLoadingFieldOptions(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoadingResidentDefaults(true)
    ;(async () => {
      try {
        const [internalRes, caseRes] = await Promise.allSettled([
          api.get<{ internalCode: string }>('/api/residents/next-internal-code'),
          api.get<{ caseControlNo: string }>('/api/residents/suggested-case-control-no'),
        ])
        if (cancelled) return

        setForm((prev) => {
          let internalCode = prev.internalCode
          let caseControlNo = prev.caseControlNo
          if (internalRes.status === 'fulfilled' && internalRes.value.data?.internalCode && !internalCode.trim()) {
            internalCode = internalRes.value.data.internalCode
          }
          if (caseRes.status === 'fulfilled' && caseRes.value.data?.caseControlNo) {
            caseControlNo = caseRes.value.data.caseControlNo
          }
          return { ...prev, internalCode, caseControlNo }
        })

        if (caseRes.status !== 'fulfilled' || !caseRes.value.data?.caseControlNo) {
          setError('Unable to assign a unique case control number. Refresh the page and try again.')
        }
      } catch {
        if (!cancelled) setError('Unable to load default resident identifiers. Refresh the page and try again.')
      } finally {
        if (!cancelled) setLoadingResidentDefaults(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const confirmed = window.confirm('Are you sure you want to create this resident record?')
    if (!confirmed) return
    setSaving(true)

    try {
      const payload = {
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
        subCatTrafficked: false,
        subCatPhysicalAbuse: false,
        subCatSexualAbuse: false,
        subCatOsaec: false,
        subCatChildLabor: false,
        subCatOrphaned: false,
        subCatCicl: false,
        subCatAtRisk: false,
        subCatStreetChild: false,
        subCatChildWithHiv: false,
        isPwd: false,
        pwdType: null,
        hasSpecialNeeds: false,
        specialNeedsDiagnosis: null,
        familyIs4ps: false,
        familySoloParent: false,
        familyIndigenous: false,
        familyParentPwd: false,
        familyInformalSettler: false,
        dateOfAdmission: form.dateOfAdmission,
        ageUponAdmission: null,
        presentAge: null,
        lengthOfStay: null,
        referralSource: form.referralSource.trim(),
        referringAgencyPerson: null,
        dateColbRegistered: null,
        dateColbObtained: null,
        assignedSocialWorker: form.assignedSocialWorker.trim(),
        initialCaseAssessment: form.initialCaseAssessment.trim(),
        dateCaseStudyPrepared: null,
        reintegrationType: null,
        reintegrationStatus: null,
        initialRiskLevel: form.initialRiskLevel.trim(),
        currentRiskLevel: form.currentRiskLevel.trim(),
        dateEnrolled: form.dateEnrolled,
        dateClosed: null,
        notesRestricted: form.notesRestricted.trim() || null,
      }

      await api.post('/api/residents', payload)
      navigate('/admin/residents')
    } catch {
      setError('Unable to create resident. Check required fields and try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-full text-surface-dark">
      <NavBar />
      <main className="mx-auto max-w-4xl px-4 py-6">
        <h1 className="text-2xl font-bold text-surface-dark">New Resident</h1>
        <form onSubmit={onSubmit} className="mt-6 rounded-2xl border border-brand-100 bg-surface p-5 shadow-sm">
          {error && <ErrorMessage message={error} />}

          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-surface-text">Case control no.</span>
              <input
                id="new-resident-caseControlNo"
                name="caseControlNo"
                value={form.caseControlNo}
                readOnly
                aria-readonly="true"
                placeholder={loadingResidentDefaults ? 'Assigning case number…' : 'Case control no. (C0001)'}
                required
                title="Assigned automatically; cannot be changed here"
                className="cursor-default rounded-md border border-brand-100 bg-brand-50 px-3 py-2 text-sm text-surface-dark"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-surface-text">Internal code</span>
              <input
                id="new-resident-internalCode"
                name="internalCode"
                value={form.internalCode}
                onChange={(e) => update('internalCode', e.target.value)}
                placeholder="e.g. LS-0061"
                required
                className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-surface-text">Safehouse</span>
              <select
                id="new-resident-safehouseId"
                name="safehouseId"
                value={form.safehouseId}
                onChange={(e) => update('safehouseId', e.target.value)}
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
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-surface-text">Case status</span>
              <select
                id="new-resident-caseStatus"
                name="caseStatus"
                value={form.caseStatus}
                onChange={(e) => update('caseStatus', e.target.value)}
                disabled={loadingFieldOptions}
                required
                className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
              >
                {caseStatusOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-surface-text">Case category</span>
              <select
                id="new-resident-caseCategory"
                name="caseCategory"
                value={form.caseCategory}
                onChange={(e) => update('caseCategory', e.target.value)}
                disabled={loadingFieldOptions}
                required
                className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
              >
                {caseCategoryOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-surface-text">Sex</span>
              <select
                id="new-resident-sex"
                name="sex"
                value={form.sex}
                onChange={(e) => update('sex', e.target.value)}
                required
                className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
              >
                {SEX_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-surface-text">Date of birth</span>
              <input
                id="new-resident-dateOfBirth"
                name="dateOfBirth"
                value={form.dateOfBirth}
                onChange={(e) => update('dateOfBirth', e.target.value)}
                type="date"
                required
                className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-surface-text">Birth status</span>
              <select
                id="new-resident-birthStatus"
                name="birthStatus"
                value={form.birthStatus}
                onChange={(e) => update('birthStatus', e.target.value)}
                required
                className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
              >
                {BIRTH_STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-surface-text">Place of birth</span>
              <select
                id="new-resident-placeOfBirth"
                name="placeOfBirth"
                value={form.placeOfBirth}
                onChange={(e) => update('placeOfBirth', e.target.value)}
                required
                className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
              >
                {PLACE_OF_BIRTH_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-surface-text">Religion</span>
              <select
                id="new-resident-religion"
                name="religion"
                value={form.religion}
                onChange={(e) => update('religion', e.target.value)}
                required
                className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
              >
                {RELIGION_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-surface-text">Referral source</span>
              <select
                id="new-resident-referralSource"
                name="referralSource"
                value={form.referralSource}
                onChange={(e) => update('referralSource', e.target.value)}
                required
                className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
              >
                {REFERRAL_SOURCE_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-surface-text">Assigned social worker</span>
              <select
                id="new-resident-assignedSocialWorker"
                name="assignedSocialWorker"
                value={form.assignedSocialWorker}
                onChange={(e) => update('assignedSocialWorker', e.target.value)}
                disabled={loadingFieldOptions}
                required
                className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
              >
                {socialWorkerOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-surface-text">Initial risk level</span>
              <select
                id="new-resident-initialRiskLevel"
                name="initialRiskLevel"
                value={form.initialRiskLevel}
                onChange={(e) => update('initialRiskLevel', e.target.value)}
                required
                className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
              >
                {RISK_LEVEL_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-surface-text">Current risk level</span>
              <select
                id="new-resident-currentRiskLevel"
                name="currentRiskLevel"
                value={form.currentRiskLevel}
                onChange={(e) => update('currentRiskLevel', e.target.value)}
                required
                className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
              >
                {RISK_LEVEL_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-surface-text">Date of admission</span>
              <input
                id="new-resident-dateOfAdmission"
                name="dateOfAdmission"
                value={form.dateOfAdmission}
                onChange={(e) => update('dateOfAdmission', e.target.value)}
                type="date"
                required
                className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-surface-text">Date enrolled</span>
              <input
                id="new-resident-dateEnrolled"
                name="dateEnrolled"
                value={form.dateEnrolled}
                onChange={(e) => update('dateEnrolled', e.target.value)}
                type="date"
                required
                className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm md:col-span-2">
              <span className="font-medium text-surface-text">Initial case assessment</span>
              <textarea
                id="new-resident-initialCaseAssessment"
                name="initialCaseAssessment"
                value={form.initialCaseAssessment}
                onChange={(e) => update('initialCaseAssessment', e.target.value)}
                placeholder="Narrative assessment (free text)"
                required
                rows={3}
                className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm md:col-span-2">
              <span className="font-medium text-surface-text">Restricted notes (optional)</span>
              <textarea
                id="new-resident-notesRestricted"
                name="notesRestricted"
                value={form.notesRestricted}
                onChange={(e) => update('notesRestricted', e.target.value)}
                placeholder="Optional internal notes"
                rows={2}
                className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
              />
            </label>
          </div>

          <div className="mt-5 flex gap-3">
            <button
              type="submit"
              disabled={
                saving ||
                loadingSafehouses ||
                safehouses.length === 0 ||
                loadingResidentDefaults ||
                loadingFieldOptions ||
                !form.caseControlNo.trim()
              }
              className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Create Resident'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/admin/residents')}
              className="rounded-md border border-brand-100 px-4 py-2 text-sm font-semibold hover:bg-brand-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
