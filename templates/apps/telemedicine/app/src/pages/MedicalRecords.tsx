import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

interface MedicalRecord {
  id: string
  patient_id: string
  patient_name: string
  date: string
  type: 'visit' | 'lab' | 'rx' | 'imaging' | 'note'
  provider: string
  summary: string
  status: 'final' | 'preliminary' | 'addendum'
}

const TYPE_ICON: Record<MedicalRecord['type'], string> = {
  visit: 'event_available',
  lab: 'science',
  rx: 'medication',
  imaging: 'radiology',
  note: 'description',
}

const TYPE_COLOR: Record<MedicalRecord['type'], string> = {
  visit: 'bg-primary-container text-on-primary-container',
  lab: 'bg-info-container text-on-info-container',
  rx: 'bg-secondary-container text-on-secondary-container',
  imaging: 'bg-warning-container text-on-warning-container',
  note: 'bg-surface-container text-on-surface',
}

export function MedicalRecords() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [params] = useSearchParams()
  const patientId = params.get('patient_id') ?? ''
  const [records, setRecords] = useState<MedicalRecord[]>([])
  const [typeFilter, setTypeFilter] = useState<'all' | MedicalRecord['type']>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const url = patientId ? `/api/records?patient_id=${patientId}` : '/api/records'
    http
      .get(url)
      .then((res) => {
        if (!cancelled) setRecords(unwrapList<MedicalRecord>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('records.loadError', {}, { defaultValue: 'Failed to load records.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, patientId, t])

  const visible = typeFilter === 'all' ? records : records.filter((r) => r.type === typeFilter)

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
          {t('records.eyebrow', {}, { defaultValue: 'Patient timeline' })}
        </p>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('records.heading', {}, { defaultValue: 'Medical records' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {patientId
            ? t(
                'records.subheadingFiltered',
                { count: visible.length },
                { defaultValue: '{{count}} records for this patient' },
              )
            : t(
                'records.subheading',
                { count: visible.length },
                { defaultValue: 'Chronological timeline · {{count}} records' },
              )}
        </p>
      </header>

      <nav
        aria-label={t('records.filterLabel', {}, { defaultValue: 'Filter by type' })}
        className={cm.cn(cm.flex({ gap: 'xs', align: 'center' }), 'flex-wrap')}
      >
        {(['all', 'visit', 'lab', 'rx', 'imaging', 'note'] as const).map((typ) => {
          const active = typeFilter === typ
          return (
            <button
              key={typ}
              type="button"
              onClick={() => setTypeFilter(typ)}
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
                `records.type.${typ}`,
                {},
                { defaultValue: typ.charAt(0).toUpperCase() + typ.slice(1) },
              )}
            </button>
          )
        })}
      </nav>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('records.loading', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : visible.length === 0 ? (
        <p className={cm.cn(cm.card(), cm.sp('p', 12), cm.textCenter, 'text-on-surface-variant')}>
          {t('records.empty', {}, { defaultValue: 'No records match.' })}
        </p>
      ) : (
        <ol className={'space-y-2 relative'}>
          {visible.map((r) => (
            <li key={r.id}>
              <article
                className={cm.cn(cm.card(), cm.sp('p', 4), cm.flex({ align: 'start', gap: 'md' }))}
              >
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.h(10),
                    cm.w(10),
                    'rounded shrink-0',
                    TYPE_COLOR[r.type],
                  )}
                >
                  <span className="material-symbols-outlined" aria-hidden="true">
                    {TYPE_ICON[r.type]}
                  </span>
                </div>
                <div className={cm.cn(cm.flex1, 'min-w-0')}>
                  <div className={cm.flex({ align: 'baseline', gap: 'sm' })}>
                    <p
                      className={cm.cn(
                        cm.textSize('xs'),
                        'text-on-surface-variant',
                        cm.fontWeight('medium'),
                      )}
                    >
                      {new Date(r.date).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                    <span
                      className={cm.cn(
                        cm.textSize('xs'),
                        'text-on-surface-variant',
                        'uppercase tracking-wider',
                      )}
                    >
                      {t(`records.type.${r.type}`, {}, { defaultValue: r.type })}
                    </span>
                    <span
                      className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant', 'ml-auto')}
                    >
                      {r.status}
                    </span>
                  </div>
                  <p
                    className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), cm.sp('mt', 1))}
                  >
                    {r.summary}
                  </p>
                  <p
                    className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant', cm.sp('mt', 1))}
                  >
                    {t(
                      'records.byProvider',
                      { name: r.provider, patient: r.patient_name },
                      { defaultValue: 'By {{name}} · {{patient}}' },
                    )}
                  </p>
                </div>
              </article>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
