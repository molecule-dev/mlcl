import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { MedicationCard } from '../components/MedicationCard.js'
import { unwrapList } from '../lib/unwrap.js'

interface Medication {
  id: string
  name: string
  dosage: string
  frequency: string
  route?: string
  prescriber?: string
  refills_total: number
  refills_used: number
  status: 'active' | 'discontinued' | 'expired'
  start_date?: string
}

const FILTERS = ['active', 'discontinued', 'all'] as const
type FilterKey = (typeof FILTERS)[number]

function refillStatus(m: Medication): { status: 'fine' | 'due_soon' | 'overdue'; days: number } {
  const remaining = m.refills_total - m.refills_used
  const days = remaining * 30 - 5
  if (days < 0) return { status: 'overdue', days }
  if (days < 7) return { status: 'due_soon', days }
  return { status: 'fine', days }
}

export function Medications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [meds, setMeds] = useState<Medication[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterKey>('active')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get('/api/medications?patient_id=me')
      .then((res) => {
        if (cancelled) return
        setMeds(unwrapList<Medication>(res))
      })
      .catch((err) => {
        if (cancelled) return
        setError(
          err instanceof Error
            ? err.message
            : t(
                'medications.loadError',
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

  const filtered = useMemo(() => {
    if (filter === 'all') return meds
    return meds.filter((m) => m.status === filter)
  }, [meds, filter])

  return (
    <div className={cm.cn(cm.maxW('5xl'), cm.mxAuto, cm.sp('p', 8))} data-mol-id="page-medications">
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' }),
          cm.sp('mb', 6),
        )}
      >
        <div>
          <p className={cm.cn('text-[10px] font-bold uppercase tracking-widest text-primary mb-1')}>
            {t('medications.eyebrow', {}, { defaultValue: 'Treatment plan' })}
          </p>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {t('medications.title', {}, { defaultValue: 'Medications' })}
          </h1>
        </div>
      </div>

      <div className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'sm' }), cm.sp('mb', 6))}>
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest rounded-full transition-colors',
              filter === f
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container',
            )}
          >
            {t(
              `medications.filter.${f}`,
              {},
              { defaultValue: f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1) },
            )}
          </button>
        ))}
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
          {t('medications.loading', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : filtered.length === 0 ? (
        <div className={cm.cn(cm.sp('py', 16), cm.textCenter)}>
          <span className={cm.cn('text-3xl material-symbols-outlined text-outline')}>
            medication
          </span>
          <p className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'), cm.sp('mt', 4))}>
            {t('medications.empty.title', {}, { defaultValue: 'No medications on file.' })}
          </p>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.sp('mt', 1))}>
            {t(
              'medications.empty.body',
              {},
              { defaultValue: 'Once a prescription is added, it will show here.' },
            )}
          </p>
        </div>
      ) : (
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
          {filtered.map((m) => {
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

      <div className={cm.cn(cm.sp('mt', 8))}>
        <Link
          to="/sharing/new"
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            'text-primary hover:underline',
          )}
        >
          {t(
            'medications.shareCta',
            {},
            { defaultValue: 'Share medication list with a provider →' },
          )}
        </Link>
      </div>
    </div>
  )
}
