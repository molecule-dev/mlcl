import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import type { UserProfile } from '@molecule/app-auth'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { HealthSummaryTriad } from '../components/HealthSummaryTriad.js'
import { LabResultRow } from '../components/LabResultRow.js'
import { MedicationCard } from '../components/MedicationCard.js'
import { type VitalChip, VitalsHeroCard } from '../components/VitalsHeroCard.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface HealthSummary {
  active_conditions: number
  active_medications: number
  active_allergies: number
  recent_labs: number
  upcoming_immunizations: number
}

interface VitalReading {
  vital_type: string
  value: number
  secondary_value?: number
  unit: string
  recorded_at: string
}

interface Medication {
  id: string
  name: string
  dosage: string
  frequency: string
  route?: string
  prescriber?: string
  refills_total: number
  refills_used: number
  status: string
}

interface LabResult {
  id: string
  test_name: string
  category: string
  results: Array<{ value: string; unit?: string }> | string
  units?: string
  reference_range?: string
  flag: 'normal' | 'abnormal' | 'critical' | 'high' | 'low'
  collected_date: string
}

const VITAL_LABEL: Record<string, string> = {
  blood_pressure: 'BP',
  heart_rate: 'HR',
  temperature: 'Temp',
  respiratory_rate: 'RR',
  oxygen_saturation: 'SpO₂',
  weight: 'Weight',
}

function vitalToChip(type: string, vital: VitalReading): VitalChip {
  const value =
    vital.secondary_value != null ? `${vital.value}/${vital.secondary_value}` : String(vital.value)
  return {
    label: VITAL_LABEL[type] || type.replace(/_/g, ' '),
    value,
    unit: vital.unit,
    state: 'normal',
  }
}

function refillStatus(m: Medication): { status: 'fine' | 'due_soon' | 'overdue'; days: number } {
  const remaining = m.refills_total - m.refills_used
  const days = remaining * 30 - 5
  if (days < 0) return { status: 'overdue', days }
  if (days < 7) return { status: 'due_soon', days }
  return { status: 'fine', days }
}

function labFlag(f: LabResult['flag']): 'normal' | 'high' | 'low' | 'critical' {
  if (f === 'critical') return 'critical'
  if (f === 'high') return 'high'
  if (f === 'low') return 'low'
  if (f === 'abnormal') return 'high'
  return 'normal'
}

function labValue(lab: LabResult): string {
  if (typeof lab.results === 'string') return lab.results
  if (Array.isArray(lab.results) && lab.results.length > 0) return lab.results[0].value
  return '—'
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user } = useAuth<UserProfile>()
  const http = useHttpClient()
  const [summary, setSummary] = useState<HealthSummary | null>(null)
  const [latestVitals, setLatestVitals] = useState<Record<string, VitalReading>>({})
  const [medications, setMedications] = useState<Medication[]>([])
  const [labs, setLabs] = useState<LabResult[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.allSettled([
      http.get('/api/stats/overview'),
      http.get('/api/vitals/me/latest'),
      http.get('/api/medications?patient_id=me&status=active&limit=5'),
      http.get('/api/labs?patient_id=me&limit=5'),
    ]).then(([sum, vit, meds, labRes]) => {
      if (cancelled) return
      if (sum.status === 'fulfilled') setSummary(unwrapSingle<HealthSummary>(sum.value))
      if (vit.status === 'fulfilled') {
        const v = unwrapSingle<Record<string, VitalReading>>(vit.value)
        if (v) setLatestVitals(v)
      }
      if (meds.status === 'fulfilled') setMedications(unwrapList<Medication>(meds.value))
      if (labRes.status === 'fulfilled') setLabs(unwrapList<LabResult>(labRes.value))
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [http])

  const vitalsChips: ReadonlyArray<VitalChip> = Object.entries(latestVitals).map(([type, vital]) =>
    vitalToChip(type, vital),
  )

  const meds = medications
  const labsList = labs

  const conditionsCount = summary?.active_conditions ?? 0
  const medicationsCount = summary?.active_medications ?? meds.length
  const labsAbnormal = labsList.filter((l) => l.flag !== 'normal').length
  const labsTotal = labsList.length
  const alertsCount = labsAbnormal + meds.filter((m) => refillStatus(m).status !== 'fine').length

  const todayLabel = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  const patientName = user?.name?.split(' ')[0] || user?.email?.split('@')[0]

  return (
    <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('p', 8))} data-mol-id="page-dashboard">
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' }),
          cm.sp('mb', 6),
        )}
      >
        <div>
          <p className={cm.cn('text-[10px] font-bold uppercase tracking-widest text-primary mb-1')}>
            {t('status.today', {}, { defaultValue: 'Today' })}
          </p>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {t('dashboard.title', {}, { defaultValue: 'Health summary' })}
          </h1>
        </div>
        <Link
          to="/sharing/new"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            'rounded-xl bg-primary text-on-primary hover:opacity-90 transition-opacity',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-base')}>share</span>
          {t('dashboard.shareCta', {}, { defaultValue: 'Share with provider' })}
        </Link>
      </div>

      <VitalsHeroCard
        patientName={patientName}
        vitals={vitalsChips}
        conditionsCount={conditionsCount}
        medicationsCount={medicationsCount}
        alertsCount={alertsCount}
        recordedLabel={todayLabel}
      />

      <div className={cm.sp('mt', 8)}>
        <HealthSummaryTriad
          conditionsCount={conditionsCount}
          medicationsCount={medicationsCount}
          labsAbnormal={labsAbnormal}
          labsTotal={labsTotal}
        />
      </div>

      {/* Two-pane: medications + recent labs */}
      <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 lg:grid-cols-2', cm.sp('mt', 8))}>
        <section>
          <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 4))}>
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
              {t('dashboard.medicationsTitle', {}, { defaultValue: 'Active medications' })}
            </h2>
            <Link
              to="/medications"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'text-primary uppercase tracking-widest hover:underline',
              )}
            >
              {t('common.viewAllArrow', {}, { defaultValue: 'View all →' })}
            </Link>
          </div>
          {loading ? (
            <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
              {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
            </p>
          ) : (
            <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
              {meds.slice(0, 5).map((m) => {
                const r = refillStatus(m)
                return (
                  <MedicationCard
                    key={m.id}
                    id={m.id}
                    name={m.name}
                    dosage={m.dosage}
                    frequency={m.frequency}
                    route={m.route}
                    prescriber={m.prescriber}
                    refillInDays={r.days}
                    refillStatus={r.status}
                  />
                )
              })}
            </div>
          )}
        </section>

        <section>
          <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 4))}>
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
              {t('dashboard.labsTitle', {}, { defaultValue: 'Recent lab results' })}
            </h2>
            <Link
              to="/labs"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'text-primary uppercase tracking-widest hover:underline',
              )}
            >
              {t('common.viewAllArrow', {}, { defaultValue: 'View all →' })}
            </Link>
          </div>
          {loading ? (
            <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
              {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
            </p>
          ) : (
            <div
              className={cm.cn(
                cm.flex({ direction: 'col', gap: 'xs' }),
                'bg-surface-container-lowest rounded-2xl shadow-sm divide-y divide-outline-variant/20',
              )}
            >
              {labsList.slice(0, 5).map((l) => (
                <LabResultRow
                  key={l.id}
                  id={l.id}
                  testName={l.test_name}
                  categoryLabel={t(`labs.category.${l.category}`, {}, { defaultValue: l.category })}
                  value={labValue(l)}
                  unit={l.units || ''}
                  referenceRange={l.reference_range || '—'}
                  flag={labFlag(l.flag)}
                  collectedLabel={fmtDate(l.collected_date)}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
