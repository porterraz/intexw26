import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ErrorMessage } from '../../components/ErrorMessage'
import { NavBar } from '../../components/NavBar'
import { api } from '../../lib/api'

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
  const [form, setForm] = useState<ResidentFormState>({
    caseControlNo: '',
    internalCode: '',
    safehouseId: '',
    caseStatus: 'Open',
    sex: 'Female',
    dateOfBirth: '',
    birthStatus: 'Registered',
    placeOfBirth: '',
    religion: 'Not specified',
    caseCategory: 'Protection',
    referralSource: 'DSWD',
    assignedSocialWorker: '',
    initialCaseAssessment: '',
    initialRiskLevel: 'Moderate',
    currentRiskLevel: 'Moderate',
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

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
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
            <input
              value={form.caseControlNo}
              onChange={(e) => update('caseControlNo', e.target.value)}
              placeholder="Case Control No"
              required
              className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
            />
            <input
              value={form.internalCode}
              onChange={(e) => update('internalCode', e.target.value)}
              placeholder="Internal Code"
              required
              className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
            />

            <select
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
            <input
              value={form.caseStatus}
              onChange={(e) => update('caseStatus', e.target.value)}
              placeholder="Case Status"
              required
              className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
            />

            <input
              value={form.caseCategory}
              onChange={(e) => update('caseCategory', e.target.value)}
              placeholder="Case Category"
              required
              className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
            />
            <input
              value={form.sex}
              onChange={(e) => update('sex', e.target.value)}
              placeholder="Sex"
              required
              className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
            />

            <input
              value={form.dateOfBirth}
              onChange={(e) => update('dateOfBirth', e.target.value)}
              type="date"
              required
              className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
            />
            <input
              value={form.birthStatus}
              onChange={(e) => update('birthStatus', e.target.value)}
              placeholder="Birth Status"
              required
              className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
            />

            <input
              value={form.placeOfBirth}
              onChange={(e) => update('placeOfBirth', e.target.value)}
              placeholder="Place of Birth"
              required
              className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
            />
            <input
              value={form.religion}
              onChange={(e) => update('religion', e.target.value)}
              placeholder="Religion"
              required
              className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
            />

            <input
              value={form.referralSource}
              onChange={(e) => update('referralSource', e.target.value)}
              placeholder="Referral Source"
              required
              className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
            />
            <input
              value={form.assignedSocialWorker}
              onChange={(e) => update('assignedSocialWorker', e.target.value)}
              placeholder="Assigned Social Worker"
              required
              className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
            />

            <input
              value={form.initialRiskLevel}
              onChange={(e) => update('initialRiskLevel', e.target.value)}
              placeholder="Initial Risk Level"
              required
              className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
            />
            <input
              value={form.currentRiskLevel}
              onChange={(e) => update('currentRiskLevel', e.target.value)}
              placeholder="Current Risk Level"
              required
              className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
            />

            <input
              value={form.dateOfAdmission}
              onChange={(e) => update('dateOfAdmission', e.target.value)}
              type="date"
              required
              className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
            />
            <input
              value={form.dateEnrolled}
              onChange={(e) => update('dateEnrolled', e.target.value)}
              type="date"
              required
              className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
            />

            <textarea
              value={form.initialCaseAssessment}
              onChange={(e) => update('initialCaseAssessment', e.target.value)}
              placeholder="Initial Case Assessment"
              required
              rows={3}
              className="md:col-span-2 rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
            />
            <textarea
              value={form.notesRestricted}
              onChange={(e) => update('notesRestricted', e.target.value)}
              placeholder="Restricted Notes (optional)"
              rows={2}
              className="md:col-span-2 rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
            />
          </div>

          <div className="mt-5 flex gap-3">
            <button
              type="submit"
              disabled={saving || loadingSafehouses || safehouses.length === 0}
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
