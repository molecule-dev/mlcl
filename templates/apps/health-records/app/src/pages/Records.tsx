import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

interface RecordEntry {
  id: string
  type: 'condition' | 'allergy' | 'visit' | 'procedure' | 'lab' | 'medication'
  title: string
  date: string
  status?: string
  detail?: string
}

const TYPE_ICON: Record<RecordEntry['type'], string> = {
  condition: 'medical_information',
  allergy: 'warning',
  visit: 'event_available',
  procedure: 'medical_services',
  lab: 'science',
  medication: 'medication',
}

const TYPE_COLOR: Record<RecordEntry['type'], string> = {
  condition: 'var(--color-clinical-caution)',
  allergy: 'var(--color-clinical-abnormal)',
  visit: 'var(--color-primary)',
  procedure: 'var(--color-secondary)',
  lab: 'var(--color-clinical-confidential)',
  medication: 'var(--color-clinical-normal)',
}

const TYPES = ['all', 'condition', 'allergy', 'visit', 'procedure', 'lab'] as const
type TypeKey = (typeof TYPES)[number]

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function Records() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [records, setRecords] = useState<RecordEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [type, setType] = useState<TypeKey>('all')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get('/api/records?patient_id=me')
      .then((res) => {
        if (cancelled) return
        setRecords(unwrapList<RecordEntry>(res))
      })
      .catch((err) => {
        if (cancelled) return
        setError(
          err instanceof Error
            ? err.message
            : t('records.loadError', {}, { defaultValue: 'Could not reach the records service.' }),
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const filtered = type === 'all' ? records : records.filter((r) => r.type === type)
  const sorted = [...filtered].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div className={cm.cn(cm.maxW('5xl'), cm.mxAuto, cm.sp('p', 8))} data-mol-id="page-records">
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' }),
          cm.sp('mb', 6),
        )}
      >
        <div>
          <p className={cm.cn('text-[10px] font-bold uppercase tracking-widest text-primary mb-1')}>
            {t('records.eyebrow', {}, { defaultValue: 'Timeline' })}
          </p>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {t('records.title', {}, { defaultValue: 'All records' })}
          </h1>
        </div>
      </div>

      <div className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'sm' }), cm.sp('mb', 6))}>
        {TYPES.map((ty) => (
          <button
            key={ty}
            type="button"
            onClick={() => setType(ty)}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest rounded-full transition-colors',
              type === ty
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container',
            )}
          >
            {t(
              `records.filter.${ty}`,
              {},
              {
                defaultValue: ty === 'all' ? 'All' : ty.charAt(0).toUpperCase() + ty.slice(1) + 's',
              },
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
          {t('records.loading', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : sorted.length === 0 ? (
        <div className={cm.cn(cm.sp('py', 16), cm.textCenter)}>
          <span className={cm.cn('text-3xl material-symbols-outlined text-outline')}>
            folder_open
          </span>
          <p className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'), cm.sp('mt', 4))}>
            {t('records.empty.title', {}, { defaultValue: 'No records here yet.' })}
          </p>
        </div>
      ) : (
        <ol className={cm.cn('space-y-3')}>
          {sorted.map((r) => (
            <li key={r.id}>
              <Link
                to={`/records/${r.id}`}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'md' }),
                  cm.sp('p', 5),
                  cm.accentCard({ tone: 'custom' }),
                  'block bg-surface-container-lowest rounded-2xl shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all',
                )}
                style={{ ['--mol-accent' as string]: TYPE_COLOR[r.type] }}
              >
                <div
                  className={cm.cn(
                    cm.shrink0,
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.w(10),
                    cm.h(10),
                    'rounded-lg',
                  )}
                  style={{
                    backgroundColor: 'color-mix(in srgb, ' + TYPE_COLOR[r.type] + ' 18%, white)',
                    color: TYPE_COLOR[r.type],
                  }}
                  aria-hidden="true"
                >
                  <span className="material-symbols-outlined">{TYPE_ICON[r.type]}</span>
                </div>
                <div className={cm.cn(cm.flex1, 'min-w-0')}>
                  <p className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'), 'truncate')}>
                    {r.title}
                  </p>
                  {r.detail && (
                    <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant truncate')}>
                      {r.detail}
                    </p>
                  )}
                </div>
                <div
                  className={cm.cn(
                    cm.shrink0,
                    cm.flex({ direction: 'col', align: 'end', gap: 'xs' }),
                  )}
                >
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      'tabular-nums text-on-surface-variant uppercase tracking-wider font-bold',
                    )}
                  >
                    {fmtDate(r.date)}
                  </span>
                  <span
                    className={cm.cn(
                      'px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest rounded-full',
                    )}
                    style={{
                      backgroundColor: 'color-mix(in srgb, ' + TYPE_COLOR[r.type] + ' 14%, white)',
                      color: TYPE_COLOR[r.type],
                    }}
                  >
                    {t(`records.type.${r.type}`, {}, { defaultValue: r.type })}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
