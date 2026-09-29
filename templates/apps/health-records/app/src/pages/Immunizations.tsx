import { useEffect, useState } from 'react'

import { track } from '@molecule/app-analytics'
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

/** Static CDC-style adult reference schedule shown beside the record list. */
const ADULT_SCHEDULE: ReadonlyArray<{ key: string; vaccine: string; cadence: string }> = [
  { key: 'flu', vaccine: 'Influenza (Flu)', cadence: '1 dose annually' },
  { key: 'tdap', vaccine: 'Tdap or Td', cadence: '1 dose every 10 yrs' },
  { key: 'covid', vaccine: 'COVID-19', cadence: 'As recommended' },
]

/** General pre-travel guidance shown for any destination. */
const TRAVEL_GUIDANCE: ReadonlyArray<string> = [
  'Routine vaccines up to date (MMR, Tdap, flu)',
  'Hepatitis A — recommended for most international travel',
  'Typhoid — for travel to regions with limited safe food and water',
  'Consult a travel clinic 4–6 weeks before departure',
]

export function Immunizations() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [items, setItems] = useState<Immunization[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [destination, setDestination] = useState('')
  const [travelOpen, setTravelOpen] = useState(false)

  const handleDownloadSchedule = () => {
    const lines = [
      t('immunizations.adultSchedule.title', {}, { defaultValue: 'Adult Schedule' }),
      '',
      ...ADULT_SCHEDULE.map((s) => `${s.vaccine} — ${s.cadence}`),
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'adult-vaccine-schedule.txt'
    a.click()
    URL.revokeObjectURL(url)
    void track({ name: 'immunizations.schedule_downloaded' })
  }

  const handleTravelCheck = () => {
    if (!destination.trim()) return
    setTravelOpen(true)
    void track({ name: 'immunizations.travel_checked' })
  }

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

      {/* Reference rail: CDC-style adult schedule + travel guidance */}
      <div className={cm.cn('grid grid-cols-1 md:grid-cols-2 gap-4', cm.sp('mt', 8))}>
        <section
          className={cm.cn(cm.sp('p', 5), 'bg-surface-container-lowest rounded-2xl shadow-sm')}
          data-mol-id="adult-schedule"
        >
          <h3
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.textSize('base'),
              cm.fontWeight('bold'),
              cm.sp('mb', 4),
              'text-on-surface',
            )}
          >
            <span
              aria-hidden="true"
              className={cm.cn('material-symbols-outlined text-primary text-xl')}
            >
              calendar_month
            </span>
            {t('immunizations.adultSchedule.title', {}, { defaultValue: 'Adult Schedule' })}
          </h3>
          <ul className={cm.stack(3)}>
            {ADULT_SCHEDULE.map((s) => (
              <li
                key={s.key}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                  cm.textSize('sm'),
                  cm.sp('pb', 2),
                  'border-b border-outline-variant/20 last:border-b-0',
                )}
              >
                <span className={cm.cn('text-on-surface-variant')}>
                  {t(
                    `immunizations.adultSchedule.${s.key}.vaccine`,
                    {},
                    { defaultValue: s.vaccine },
                  )}
                </span>
                <span className={cm.cn(cm.fontWeight('medium'), 'text-on-surface')}>
                  {t(
                    `immunizations.adultSchedule.${s.key}.cadence`,
                    {},
                    { defaultValue: s.cadence },
                  )}
                </span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={handleDownloadSchedule}
            data-mol-id="download-schedule"
            className={cm.cn(
              'w-full mt-4 py-2 border border-outline-variant rounded-lg text-sm font-medium text-on-surface hover:bg-surface-container transition-colors',
            )}
          >
            {t(
              'immunizations.adultSchedule.download',
              {},
              { defaultValue: 'Download PDF Schedule' },
            )}
          </button>
        </section>

        <section
          className={cm.cn(cm.sp('p', 5), 'bg-surface-container-lowest rounded-2xl shadow-sm')}
          data-mol-id="travel-requirements"
        >
          <h3
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.textSize('base'),
              cm.fontWeight('bold'),
              cm.sp('mb', 4),
              'text-on-surface',
            )}
          >
            <span
              aria-hidden="true"
              className={cm.cn('material-symbols-outlined text-primary text-xl')}
            >
              flight_takeoff
            </span>
            {t('immunizations.travel.title', {}, { defaultValue: 'Travel Requirements' })}
          </h3>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.sp('mb', 4))}>
            {t(
              'immunizations.travel.body',
              {},
              {
                defaultValue:
                  'Planning a trip? Check required and recommended vaccines for your destination.',
              },
            )}
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleTravelCheck()
            }}
            className="relative"
          >
            <span
              aria-hidden="true"
              className={cm.cn(
                'material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg',
              )}
            >
              location_on
            </span>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder={t(
                'immunizations.travel.placeholder',
                {},
                { defaultValue: 'Enter destination country...' },
              )}
              aria-label={t(
                'immunizations.travel.placeholder',
                {},
                { defaultValue: 'Enter destination country...' },
              )}
              className={cm.cn(
                'w-full pl-9 pr-4 py-2 bg-surface-container border border-outline-variant rounded-lg text-sm text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none',
              )}
            />
          </form>
          {travelOpen ? (
            <div className={cm.cn(cm.sp('mt', 4), cm.stack(2))} role="status">
              <p className={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'), 'text-on-surface')}>
                {t(
                  'immunizations.travel.forDestination',
                  { destination: destination.trim() },
                  { defaultValue: 'General guidance for {{destination}}:' },
                )}
              </p>
              <ul className={cm.stack(1)}>
                {TRAVEL_GUIDANCE.map((g) => (
                  <li
                    key={g}
                    className={cm.cn(
                      cm.flex({ align: 'start', gap: 'xs' }),
                      cm.textSize('xs'),
                      'text-on-surface-variant',
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cm.cn('material-symbols-outlined text-sm text-success')}
                    >
                      check_circle
                    </span>
                    {g}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  )
}
