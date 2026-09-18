import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { type LabFlag, LabResultRow } from '../components/LabResultRow.js'
import { unwrapList } from '../lib/unwrap.js'

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

const CATEGORIES = ['all', 'blood', 'urine', 'imaging', 'pathology'] as const
type CategoryKey = (typeof CATEGORIES)[number]

function labFlag(f: LabResult['flag']): LabFlag {
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

export function LabResults() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [labs, setLabs] = useState<LabResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [category, setCategory] = useState<CategoryKey>('all')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get('/api/labs?patient_id=me')
      .then((res) => {
        if (cancelled) return
        setLabs(unwrapList<LabResult>(res))
      })
      .catch((err) => {
        if (cancelled) return
        setError(
          err instanceof Error
            ? err.message
            : t(
                'labResults.loadError',
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
    if (category === 'all') return labs
    return labs.filter((l) => l.category === category)
  }, [labs, category])

  /**
   * Build a per-test trend from real lab data: for each `test_name`, gather
   * up to the last 6 numeric values in chronological order, then normalise
   * them to [0..1] so the sparkline draws over its tile. Tests with fewer
   * than 2 numeric readings get no sparkline (`undefined`).
   */
  const trends = useMemo(() => {
    const byName = new Map<string, Array<{ date: string; value: number }>>()
    for (const lab of labs) {
      const raw =
        typeof lab.results === 'string'
          ? lab.results
          : Array.isArray(lab.results) && lab.results.length > 0
            ? lab.results[0].value
            : null
      const numeric = raw != null ? Number(raw) : NaN
      if (!Number.isFinite(numeric)) continue
      const list = byName.get(lab.test_name) ?? []
      list.push({ date: lab.collected_date, value: numeric })
      byName.set(lab.test_name, list)
    }
    const out: Record<string, number[]> = {}
    for (const [name, list] of byName.entries()) {
      if (list.length < 2) continue
      const ordered = list
        .slice()
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-6)
        .map((p) => p.value)
      const min = Math.min(...ordered)
      const max = Math.max(...ordered)
      const span = max - min || 1
      out[name] = ordered.map((v) => (v - min) / span)
    }
    return out
  }, [labs])

  const flagged = filtered.filter((l) => labFlag(l.flag) !== 'normal').length

  return (
    <div className={cm.cn(cm.maxW('6xl'), cm.mxAuto, cm.sp('p', 8))} data-mol-id="page-lab-results">
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' }),
          cm.sp('mb', 6),
        )}
      >
        <div>
          <p className={cm.cn('text-[10px] font-bold uppercase tracking-widest text-primary mb-1')}>
            {t('labResults.eyebrow', {}, { defaultValue: 'Diagnostics' })}
          </p>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {t('labResults.title', {}, { defaultValue: 'Lab results' })}
          </h1>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          <span
            className={cm.cn(
              'px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest',
            )}
            style={{
              backgroundColor: 'var(--color-clinical-abnormal-bg)',
              color: 'var(--color-clinical-abnormal)',
            }}
          >
            {t('labResults.flagged', { count: flagged }, { defaultValue: '{{count}} flagged' })}
          </span>
        </div>
      </div>

      <div className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'sm' }), cm.sp('mb', 6))}>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest rounded-full transition-colors',
              category === c
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container',
            )}
          >
            {t(
              `labResults.category.${c}`,
              {},
              { defaultValue: c === 'all' ? 'All' : c.charAt(0).toUpperCase() + c.slice(1) },
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
          {t('labResults.loading', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : filtered.length === 0 ? (
        <div className={cm.cn(cm.sp('py', 16), cm.textCenter)}>
          <span className={cm.cn('text-3xl material-symbols-outlined text-outline')}>science</span>
          <p className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'), cm.sp('mt', 4))}>
            {t('labResults.empty.title', {}, { defaultValue: 'No lab results in this category.' })}
          </p>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.sp('mt', 1))}>
            {t(
              'labResults.empty.body',
              {},
              { defaultValue: 'Switch the filter or wait for new results to arrive.' },
            )}
          </p>
        </div>
      ) : (
        <div
          className={cm.cn(
            'bg-surface-container-lowest rounded-2xl shadow-sm divide-y divide-outline-variant/20',
          )}
        >
          {filtered.map((l) => (
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
              trend={trends[l.test_name]}
            />
          ))}
        </div>
      )}
    </div>
  )
}
