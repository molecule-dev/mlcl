import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

interface Prescription {
  id: string
  patient_id: string
  patient_name: string
  drug: string
  dose: string
  frequency: string
  quantity: number
  refills_left: number
  pharmacy: string
  prescribed_at: string
  status: 'active' | 'pending_pharmacy' | 'filled' | 'expired' | 'cancelled'
  prescriber: string
}

const FILTERS = ['active', 'pending_pharmacy', 'filled', 'expired', 'all'] as const
type Filter = (typeof FILTERS)[number]

const STATUS_COLOR: Record<Prescription['status'], string> = {
  active: 'bg-success-container text-on-success-container',
  pending_pharmacy: 'bg-warning-container text-on-warning-container',
  filled: 'bg-info-container text-on-info-container',
  expired: 'bg-surface-container text-on-surface',
  cancelled: 'bg-error-container text-on-error-container',
}

export function Prescriptions() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [list, setList] = useState<Prescription[]>([])
  const [filter, setFilter] = useState<Filter>('active')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/prescriptions')
      .then((res) => {
        if (!cancelled) setList(unwrapList<Prescription>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(
            t('prescriptions.loadError', {}, { defaultValue: 'Failed to load prescriptions.' }),
          )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const visible = useMemo(() => {
    if (filter === 'all') return list
    return list.filter((p) => p.status === filter)
  }, [list, filter])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, 'space-y-6')}>
      <header>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.sp('mb', 2),
            'uppercase tracking-widest text-primary',
          )}
        >
          {t('prescriptions.eyebrow', {}, { defaultValue: 'E-prescribing' })}
        </p>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('prescriptions.heading', {}, { defaultValue: 'Prescriptions' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'prescriptions.subheading',
            { count: visible.length },
            { defaultValue: '{{count}} prescriptions' },
          )}
        </p>
      </header>

      <nav
        aria-label={t('prescriptions.filterLabel', {}, { defaultValue: 'Filter prescriptions' })}
        className={cm.cn(cm.flex({ gap: 'xs', align: 'center' }), 'flex-wrap')}
      >
        {FILTERS.map((f) => {
          const active = filter === f
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('xs'),
                cm.fontWeight('medium'),
                'rounded-full',
                active
                  ? 'bg-primary text-on-primary'
                  : cm.cn('bg-surface border border-outline-variant', 'text-on-surface-variant'),
              )}
              aria-pressed={active}
            >
              {t(
                `prescriptions.filter.${f}`,
                {},
                { defaultValue: f.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()) },
              )}
            </button>
          )
        })}
      </nav>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('prescriptions.loading', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : visible.length === 0 ? (
        <p className={cm.cn(cm.card(), cm.sp('p', 12), cm.textCenter, 'text-on-surface-variant')}>
          {t('prescriptions.empty', {}, { defaultValue: 'No prescriptions match.' })}
        </p>
      ) : (
        <ul className={'space-y-2'}>
          {visible.map((p) => (
            <li key={p.id}>
              <article className={cm.cn(cm.card(), cm.sp('p', 4))}>
                <div className={cm.flex({ align: 'start', justify: 'between', gap: 'md' })}>
                  <div className={cm.cn(cm.flex1, 'min-w-0 space-y-1')}>
                    <div className={cm.flex({ align: 'baseline', gap: 'sm' })}>
                      <p
                        className={cm.cn(
                          cm.textSize('base'),
                          cm.fontWeight('semibold'),
                          'truncate',
                        )}
                        style={{ fontFamily: 'var(--font-family-mono)' }}
                      >
                        {p.drug}
                      </p>
                      <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                        {p.dose} · {p.frequency}
                      </span>
                    </div>
                    <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant', 'truncate')}>
                      {t(
                        'prescriptions.forPatient',
                        { patient: p.patient_name },
                        { defaultValue: 'For {{patient}}' },
                      )}{' '}
                      · {p.pharmacy}
                    </p>
                    <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {t(
                        'prescriptions.refills',
                        { qty: p.quantity, refills: p.refills_left },
                        { defaultValue: '{{qty}} units · {{refills}} refills left' },
                      )}
                    </p>
                  </div>
                  <div className={cm.cn(cm.shrink0, cm.textCenter, 'space-y-2')}>
                    <span
                      className={cm.cn(
                        cm.sp('px', 2),
                        cm.sp('py', 1),
                        cm.textSize('xs'),
                        'rounded',
                        STATUS_COLOR[p.status],
                      )}
                    >
                      {t(
                        `prescriptions.status.${p.status}`,
                        {},
                        { defaultValue: p.status.replace('_', ' ') },
                      )}
                    </span>
                    <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {new Date(p.prescribed_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
