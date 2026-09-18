import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { NoshTopBar } from '../components/NoshTopBar.js'

interface WeightLog {
  id: string
  weight_kg: number | string
  recorded_at: string
}

const num = (v: number | string | null | undefined): number => {
  const n = typeof v === 'string' ? Number.parseFloat(v) : (v ?? 0)
  return Number.isFinite(n) ? Number(n) : 0
}

const KG_TO_LB = 2.20462

const formatDate = (iso: string): string => {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function WeightTracking() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [unit, setUnit] = useState<'lb' | 'kg'>('lb')
  const [logs, setLogs] = useState<WeightLog[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showLogForm, setShowLogForm] = useState(false)
  const [newWeight, setNewWeight] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [refreshTick, setRefreshTick] = useState(0)
  const [info, setInfo] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setError(null)
    http
      .get<WeightLog[]>('/api/weight?limit=12')
      .then((res) => {
        if (cancelled) return
        const arr = Array.isArray(res.data) ? (res.data as WeightLog[]) : []
        setLogs(arr)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(
          e instanceof Error
            ? e.message
            : t('nosh.weight.fetchError', {}, { defaultValue: 'Could not load weight history.' }),
        )
        setLogs([])
      })
    return () => {
      cancelled = true
    }
  }, [http, t, refreshTick])

  const entries = useMemo(() => {
    if (!logs) return []
    return logs.map((l, i) => {
      const kg = num(l.weight_kg)
      const value = unit === 'lb' ? kg * KG_TO_LB : kg
      const next = logs[i + 1]
      const delta = next
        ? value - (unit === 'lb' ? num(next.weight_kg) * KG_TO_LB : num(next.weight_kg))
        : 0
      return {
        id: l.id,
        date: formatDate(l.recorded_at),
        value: Math.round(value * 10) / 10,
        delta: Math.round(delta * 10) / 10,
      }
    })
  }, [logs, unit])

  const points = useMemo(() => {
    if (entries.length < 2) return ''
    const values = entries.map((e) => e.value)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const range = Math.max(0.1, max - min)
    return entries
      .map((e, i) => {
        const x = (i / (entries.length - 1)) * 100
        const y = 100 - ((e.value - min) / range) * 100
        return `${x},${y}`
      })
      .reverse()
      .join(' ')
  }, [entries])

  const current = entries[0]
  const totalDelta =
    entries.length > 1
      ? Math.round((entries[0].value - entries[entries.length - 1].value) * 10) / 10
      : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const parsed = Number.parseFloat(newWeight)
    if (!Number.isFinite(parsed) || parsed <= 0 || submitting) return
    const kg = unit === 'lb' ? parsed / KG_TO_LB : parsed
    setSubmitting(true)
    try {
      await http.post('/api/weight', { weight_kg: kg })
      setNewWeight('')
      setShowLogForm(false)
      setRefreshTick((n) => n + 1)
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : t('nosh.weight.logError', {}, { defaultValue: 'Could not save weight.' }),
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <NoshTopBar
        title={t('nosh.weight.heading', {}, { defaultValue: 'Weight tracking' })}
        eyebrow={t('nosh.weight.eyebrow', {}, { defaultValue: 'Trends from your logs' })}
        actions={
          <div
            className={cm.cn(
              cm.flex({ align: 'center' }),
              cm.sp('p', 1),
              'rounded-full bg-surface-variant gap-1',
            )}
          >
            {(['lb', 'kg'] as const).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => {
                  setUnit(u)
                  setInfo(
                    t(
                      `nosh.weight.unit.${u}`,
                      {},
                      { defaultValue: u === 'lb' ? 'Showing pounds' : 'Showing kilograms' },
                    ),
                  )
                  setRefreshTick((n) => n + 1)
                }}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 1),
                  cm.textSize('sm'),
                  'rounded-full transition-colors',
                  unit === u
                    ? 'bg-surface text-primary font-semibold shadow-sm'
                    : 'text-on-surface-variant font-medium',
                )}
              >
                {u}
              </button>
            ))}
          </div>
        }
      />

      {error ? (
        <div
          className={cm.cn(
            cm.sp('p', 3),
            cm.textSize('sm'),
            'rounded-lg bg-error-container text-on-error-container',
          )}
          role="alert"
        >
          {error}
        </div>
      ) : null}
      {info ? (
        <div
          className={cm.cn(
            cm.sp('p', 3),
            cm.textSize('sm'),
            'rounded-lg bg-success-container text-on-success-container',
          )}
          role="status"
        >
          {info}
        </div>
      ) : null}

      <section
        className={cm.cn(
          cm.sp('p', 8),
          'bg-gradient-to-br from-primary-container to-surface rounded-2xl shadow-sm',
        )}
      >
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-primary',
          )}
        >
          {t('nosh.weight.current', {}, { defaultValue: 'Current weight' })}
        </p>
        <div className={cm.cn(cm.flex({ align: 'baseline', gap: 'sm' }), cm.sp('mt', 2))}>
          <span className={cm.cn('text-6xl font-extrabold text-on-surface tabular-nums')}>
            {current ? current.value.toFixed(1) : '—'}
          </span>
          <span
            className={cm.cn(
              cm.textSize('lg'),
              cm.fontWeight('semibold'),
              'text-on-surface-variant uppercase tracking-widest',
            )}
          >
            {unit}
          </span>
        </div>
        {entries.length > 1 ? (
          <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-success mt-2')}>
            {t(
              'nosh.weight.delta',
              {
                count: Math.abs(totalDelta),
                unit,
                dir: totalDelta < 0 ? '↓' : totalDelta > 0 ? '↑' : '—',
              },
              { defaultValue: '{{dir}} {{count}} {{unit}} since first log' },
            )}
          </p>
        ) : null}

        {points ? (
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className={cm.cn('w-full h-32 mt-6')}
            aria-hidden="true"
          >
            <polyline
              points={points}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={cm.cn('text-primary')}
            />
            <polyline
              points={`0,100 ${points} 100,100`}
              fill="currentColor"
              className={cm.cn('text-primary opacity-20')}
            />
          </svg>
        ) : null}
      </section>

      <section className={cm.cn(cm.sp('p', 6), 'bg-surface rounded-2xl shadow-sm')}>
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 4))}>
          <h3 className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface')}>
            {t('nosh.weight.entriesTitle', {}, { defaultValue: 'Your entries' })}
          </h3>
          <button
            type="button"
            onClick={() => setShowLogForm((v) => !v)}
            aria-expanded={showLogForm}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'bg-accent text-on-accent rounded-full hover:bg-accent/90 transition-colors',
            )}
          >
            <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-base')}>
              {showLogForm ? 'close' : 'add'}
            </span>
            {showLogForm
              ? t('common.cancel', {}, { defaultValue: 'Cancel' })
              : t('nosh.weight.logEntry', {}, { defaultValue: 'Log weight' })}
          </button>
        </div>

        {showLogForm ? (
          <form
            onSubmit={handleSubmit}
            className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), cm.sp('mb', 4))}
          >
            <label
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('nosh.weight.input', { unit }, { defaultValue: 'Weight ({{unit}})' })}
            </label>
            <div className={cm.cn(cm.flex({ gap: 'sm' }))}>
              <input
                type="number"
                step="0.1"
                min="20"
                max="1000"
                required
                value={newWeight}
                onChange={(e) => setNewWeight(e.target.value)}
                placeholder={unit === 'lb' ? '170.0' : '77.0'}
                className={cm.cn(
                  'flex-1 h-11 px-4 rounded-xl bg-surface border border-outline focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-on-surface tabular-nums outline-none',
                )}
              />
              <button
                type="submit"
                disabled={submitting || !newWeight.trim()}
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.fontWeight('semibold'),
                  'bg-accent text-on-accent rounded-full hover:bg-accent/90 transition-colors disabled:opacity-50',
                )}
              >
                {submitting
                  ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                  : t('common.save', {}, { defaultValue: 'Save' })}
              </button>
            </div>
          </form>
        ) : null}

        {logs === null ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('nosh.weight.loading', {}, { defaultValue: 'Loading entries…' })}
          </p>
        ) : entries.length === 0 ? (
          <div
            className={cm.cn(
              cm.sp('py', 6),
              cm.flex({ direction: 'col', align: 'center', gap: 'sm' }),
              'text-center',
            )}
          >
            <span
              aria-hidden="true"
              className={cm.cn('material-symbols-outlined text-4xl text-on-surface-variant')}
            >
              monitor_weight
            </span>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'nosh.weight.empty',
                {},
                { defaultValue: 'No weigh-ins yet — log your first to start tracking trends.' },
              )}
            </p>
          </div>
        ) : (
          <ul
            className={cm.cn(cm.flex({ direction: 'col' }), 'list-none divide-y divide-outline/30')}
          >
            {entries.map((e) => (
              <li
                key={e.id}
                className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('py', 3))}
              >
                <div>
                  <p className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface')}>{e.date}</p>
                  <p
                    className={cm.cn(
                      cm.textSize('sm'),
                      e.delta < 0
                        ? 'text-success'
                        : e.delta > 0
                          ? 'text-error'
                          : 'text-on-surface-variant',
                    )}
                  >
                    {e.delta === 0
                      ? '—'
                      : `${e.delta > 0 ? '↑' : '↓'} ${Math.abs(e.delta).toFixed(1)} ${unit}`}
                  </p>
                </div>
                <span
                  className={cm.cn(
                    cm.textSize('lg'),
                    cm.fontWeight('bold'),
                    'text-on-surface tabular-nums',
                  )}
                >
                  {e.value.toFixed(1)} {unit}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
