import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ImmunizationRow, type ImmunizationStatus } from '../components/ImmunizationRow.js'
import { unwrapList } from '../lib/unwrap.js'

/**
 * Wire shape returned by `GET /api/immunizations` — mirrors the
 * `immunizations` table (series_total, administered_date,
 * expiration_date, etc.). The frontend derives a presentable
 * `status` and `total_doses` from the raw row so the API stays
 * minimal and consistent with the schema.
 */
interface ImmunizationRow {
  id: string
  vaccine_name: string
  administered_date: string | null
  administered_at?: string | null
  dose_number: number
  series_total: number
  expiration_date?: string | null
  manufacturer?: string | null
}

interface Immunization {
  id: string
  vaccine_name: string
  administered_date: string
  dose_number: number
  total_doses: number
  manufacturer?: string
  status: ImmunizationStatus
}

function deriveStatus(row: ImmunizationRow): ImmunizationStatus {
  const now = Date.now()
  if (row.expiration_date) {
    const exp = Date.parse(row.expiration_date)
    if (!Number.isNaN(exp) && exp < now) return 'overdue'
  }
  if (row.dose_number < row.series_total) return 'in_progress'
  return 'up_to_date'
}

function normalizeImmunization(row: ImmunizationRow): Immunization | null {
  const dateIso = row.administered_date ?? row.administered_at ?? null
  if (!dateIso) return null
  return {
    id: row.id,
    vaccine_name: row.vaccine_name,
    administered_date: typeof dateIso === 'string' ? dateIso : new Date(dateIso).toISOString(),
    dose_number: row.dose_number,
    total_doses: row.series_total,
    manufacturer: row.manufacturer ?? undefined,
    status: deriveStatus(row),
  }
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function Immunizations() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [items, setItems] = useState<Immunization[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get('/api/immunizations?patient_id=me')
      .then((res) => {
        if (cancelled) return
        const rows = unwrapList<ImmunizationRow>(res)
        const normalized = rows
          .map(normalizeImmunization)
          .filter((i): i is Immunization => i !== null)
        setItems(normalized)
      })
      .catch((err) => {
        if (cancelled) return
        setError(
          err instanceof Error
            ? err.message
            : t(
                'immunizations.loadError',
                {},
                { defaultValue: 'Could not reach the records service.' },
              ),
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const overdue = items.filter((i) => i.status === 'overdue').length
  const inProgress = items.filter((i) => i.status === 'in_progress').length

  return (
    <div
      className={cm.cn(cm.maxW('5xl'), cm.mxAuto, cm.sp('p', 8))}
      data-mol-id="page-immunizations"
    >
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' }),
          cm.sp('mb', 6),
        )}
      >
        <div>
          <p className={cm.cn('text-[10px] font-bold uppercase tracking-widest text-primary mb-1')}>
            {t('immunizations.eyebrow', {}, { defaultValue: 'Vaccinations' })}
          </p>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {t('immunizations.title', {}, { defaultValue: 'Immunizations' })}
          </h1>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          {overdue > 0 && (
            <span
              className={cm.cn(
                'px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest',
              )}
              style={{
                backgroundColor: 'var(--color-clinical-overdue-bg)',
                color: 'var(--color-clinical-overdue)',
              }}
            >
              {t(
                'immunizations.overdueCount',
                { count: overdue },
                { defaultValue: '{{count}} overdue' },
              )}
            </span>
          )}
          {inProgress > 0 && (
            <span
              className={cm.cn(
                'px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-info-container text-on-info-container',
              )}
            >
              {t(
                'immunizations.inProgressCount',
                { count: inProgress },
                { defaultValue: '{{count}} in progress' },
              )}
            </span>
          )}
        </div>
      </div>

      {error && (
        <p
          className={cm.cn(
            cm.sp('mb', 4),
            cm.textSize('xs'),
            'text-on-surface-variant uppercase tracking-widest font-bold',
          )}
        >
          {error}
        </p>
      )}

      {loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, cm.textMuted)}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : items.length === 0 ? (
        <div className={cm.cn(cm.sp('py', 16), cm.textCenter)}>
          <span className={cm.cn('text-3xl material-symbols-outlined text-outline')}>vaccines</span>
          <p className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'), cm.sp('mt', 4))}>
            {t('immunizations.empty.title', {}, { defaultValue: 'No vaccinations recorded yet.' })}
          </p>
        </div>
      ) : (
        <div
          className={cm.cn(
            'bg-surface-container-lowest rounded-2xl shadow-sm divide-y divide-outline-variant/20',
          )}
        >
          {items.map((i) => (
            <ImmunizationRow
              key={i.id}
              vaccineName={i.vaccine_name}
              administeredLabel={fmtDate(i.administered_date)}
              doseNumber={i.dose_number}
              totalDoses={i.total_doses}
              manufacturer={i.manufacturer}
              status={i.status}
            />
          ))}
        </div>
      )}
    </div>
  )
}
