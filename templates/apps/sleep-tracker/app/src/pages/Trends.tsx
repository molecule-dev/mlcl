import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { RecoveryRingsTriad } from '../components/RecoveryRingsTriad.js'
import { SleepTrendChart } from '../components/SleepTrendChart.js'
import { sleepGoalMinutes } from '../lib/goal.js'
import { unwrapList } from '../lib/unwrap.js'

type Period = '7d' | '30d' | '90d'

interface SleepLog {
  id: string
  sleep_date: string
  duration_minutes: number
  quality_score: number | null
  sleep_stages?: { deep?: number; light?: number; rem?: number; awake?: number }
}

const PERIOD_DAYS: Record<Period, number> = { '7d': 7, '30d': 30, '90d': 90 }

const STAGE_COLORS = {
  deep: 'var(--color-stage-deep)',
  light: 'var(--color-stage-light)',
  rem: 'var(--color-stage-rem)',
  awake: 'var(--color-stage-awake)',
} as const

function shortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  } catch (_error) {
    // invalid date string — return raw value as fallback
    return iso
  }
}

export function Trends() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [period, setPeriod] = useState<Period>('30d')
  const [logsByPeriod, setLogsByPeriod] = useState<Record<Period, SleepLog[]>>({
    '7d': [],
    '30d': [],
    '90d': [],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const days = PERIOD_DAYS[period]
    setLoading(true)
    http
      .get(`/api/stats/trends?days=${days}`)
      .then((res) => {
        if (cancelled) return
        const list = unwrapList<SleepLog>(res)
        setLogsByPeriod((prev) => ({ ...prev, [period]: list }))
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, period])

  const logs = logsByPeriod[period]

  const points = useMemo(
    () =>
      logs.map((l) => ({
        date: shortDate(l.sleep_date),
        durationHours: Math.round((l.duration_minutes / 60) * 10) / 10,
        score: l.quality_score ?? 0,
      })),
    [logs],
  )

  const avgHours = useMemo(
    () =>
      points.length === 0 ? 0 : points.reduce((s, p) => s + p.durationHours, 0) / points.length,
    [points],
  )
  const avgScore = useMemo(
    () => (points.length === 0 ? 0 : points.reduce((s, p) => s + p.score, 0) / points.length),
    [points],
  )

  const stageBreakdown = useMemo(() => {
    if (logs.length === 0) {
      return [
        { label: 'Deep', minutes: 0, pct: 0, color: STAGE_COLORS.deep },
        { label: 'Light', minutes: 0, pct: 0, color: STAGE_COLORS.light },
        { label: 'REM', minutes: 0, pct: 0, color: STAGE_COLORS.rem },
        { label: 'Awake', minutes: 0, pct: 0, color: STAGE_COLORS.awake },
      ]
    }
    const totals = { deep: 0, light: 0, rem: 0, awake: 0 }
    for (const l of logs) {
      const s = l.sleep_stages
      if (!s) continue
      totals.deep += s.deep ?? 0
      totals.light += s.light ?? 0
      totals.rem += s.rem ?? 0
      totals.awake += s.awake ?? 0
    }
    const sum = Math.max(1, totals.deep + totals.light + totals.rem + totals.awake)
    const avgN = Math.max(1, logs.length)
    return [
      {
        label: 'Deep',
        minutes: Math.round(totals.deep / avgN),
        pct: Math.round((totals.deep / sum) * 100),
        color: STAGE_COLORS.deep,
      },
      {
        label: 'Light',
        minutes: Math.round(totals.light / avgN),
        pct: Math.round((totals.light / sum) * 100),
        color: STAGE_COLORS.light,
      },
      {
        label: 'REM',
        minutes: Math.round(totals.rem / avgN),
        pct: Math.round((totals.rem / sum) * 100),
        color: STAGE_COLORS.rem,
      },
      {
        label: 'Awake',
        minutes: Math.round(totals.awake / avgN),
        pct: Math.round((totals.awake / sum) * 100),
        color: STAGE_COLORS.awake,
      },
    ]
  }, [logs])

  const deepPct = stageBreakdown.find((s) => s.label === 'Deep')?.pct ?? 0

  return (
    <div className={cm.cn(cm.sp('p', 8), 'space-y-8')}>
      <header
        className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), 'flex-wrap gap-4')}
      >
        <div>
          <p
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('trends.eyebrow', {}, { defaultValue: 'Patterns' })}
          </p>
          <h1
            className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight', cm.sp('mt', 1))}
          >
            {t('trends.heading', {}, { defaultValue: 'How your sleep is trending' })}
          </h1>
        </div>
        <div
          className={cm.cn(
            cm.flex({ gap: 'xs' }),
            cm.sp('p', 1),
            'bg-surface-container rounded-full',
          )}
        >
          {(['7d', '30d', '90d'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.fontWeight('bold'),
                'text-xs rounded-full uppercase tracking-widest transition-colors min-h-10',
                period === p
                  ? 'bg-primary text-on-primary'
                  : 'text-on-surface-variant hover:text-on-surface',
              )}
            >
              {t(`trends.period.${p}`, {}, { defaultValue: p })}
            </button>
          ))}
        </div>
      </header>

      {!loading && points.length === 0 ? (
        <section
          className={cm.cn(
            cm.sp('p', 8),
            'rounded-2xl bg-surface-container-lowest text-center space-y-3',
          )}
          data-testid="trends-empty"
        >
          <h2 className={cm.cn('text-xl font-extrabold tracking-tight')}>
            {t('trends.empty.title', {}, { defaultValue: 'No data for this period' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), cm.textMuted, 'max-w-md mx-auto')}>
            {t(
              'trends.empty.body',
              {},
              { defaultValue: 'Track a few nights to see patterns and recovery rings.' },
            )}
          </p>
        </section>
      ) : (
        <>
          <RecoveryRingsTriad
            durationMinutes={Math.round(avgHours * 60)}
            durationGoalMinutes={sleepGoalMinutes()}
            deepSleepPct={deepPct}
            deepSleepGoalPct={22}
            restingHeartRate={54}
            restingHeartRateBaseline={58}
          />

          <SleepTrendChart points={points} />

          <section className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 lg:grid-cols-2')}>
            <div
              className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-2xl shadow-sm')}
            >
              <h3
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-[10px] uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('trends.stageBreakdown.title', {}, { defaultValue: 'Stage breakdown' })}
              </h3>
              <p
                className={cm.cn(
                  cm.textSize('lg'),
                  cm.fontWeight('bold'),
                  cm.sp('mt', 1),
                  cm.sp('mb', 4),
                )}
              >
                {t(
                  'trends.stageBreakdown.caption',
                  { hours: avgHours.toFixed(1) },
                  { defaultValue: 'Average split across {{hours}}h' },
                )}
              </p>
              <div
                className={cm.cn('flex h-3 w-full overflow-hidden rounded-full')}
                style={{ backgroundColor: 'var(--color-surface-container)' }}
              >
                {stageBreakdown.map((s) => (
                  <div key={s.label} style={{ width: `${s.pct}%`, backgroundColor: s.color }} />
                ))}
              </div>
              <ul className={cm.cn(cm.sp('mt', 4), 'space-y-2')}>
                {stageBreakdown.map((s) => (
                  <li key={s.label} className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                    <span
                      className={cm.cn('rounded-sm')}
                      style={{ width: 12, height: 12, backgroundColor: s.color }}
                      aria-hidden="true"
                    />
                    <span className={cm.cn(cm.flex1, cm.textSize('sm'), cm.fontWeight('semibold'))}>
                      {t(
                        `trends.stageBreakdown.stage.${s.label.toLowerCase()}`,
                        {},
                        { defaultValue: s.label },
                      )}
                    </span>
                    <span
                      className={cm.cn(cm.fontWeight('bold'), cm.textSize('sm'))}
                      style={{ fontVariantNumeric: 'tabular-nums' }}
                    >
                      {s.pct}%
                    </span>
                    <span className={cm.cn(cm.textSize('xs'), cm.textMuted, 'whitespace-nowrap')}>
                      {t(
                        'trends.stageBreakdown.minutes',
                        { minutes: s.minutes },
                        { defaultValue: '{{minutes}}m' },
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div
              className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-2xl shadow-sm')}
            >
              <h3
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-[10px] uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('form.summary', {}, { defaultValue: 'Summary' })}
              </h3>
              <p
                className={cm.cn(
                  cm.textSize('lg'),
                  cm.fontWeight('bold'),
                  cm.sp('mt', 1),
                  cm.sp('mb', 4),
                )}
              >
                {t('trends.summary.caption', { period }, { defaultValue: 'Last {{period}}' })}
              </p>
              <dl className={cm.cn('grid grid-cols-2 gap-4')}>
                <div>
                  <dt
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      'text-[10px] uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('trends.summary.avgDuration', {}, { defaultValue: 'Avg duration' })}
                  </dt>
                  <dd
                    className={cm.cn('text-3xl font-extrabold tracking-tight', cm.sp('mt', 1))}
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {avgHours.toFixed(1)}h
                  </dd>
                </div>
                <div>
                  <dt
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      'text-[10px] uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('trends.summary.avgScore', {}, { defaultValue: 'Avg score' })}
                  </dt>
                  <dd
                    className={cm.cn('text-3xl font-extrabold tracking-tight', cm.sp('mt', 1))}
                    style={{
                      fontVariantNumeric: 'tabular-nums',
                      color: 'var(--color-border-focus)',
                    }}
                  >
                    {avgScore.toFixed(0)}
                  </dd>
                </div>
                <div>
                  <dt
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      'text-[10px] uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('trends.summary.totalNights', {}, { defaultValue: 'Total nights' })}
                  </dt>
                  <dd
                    className={cm.cn('text-3xl font-extrabold tracking-tight', cm.sp('mt', 1))}
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {logs.length}
                  </dd>
                </div>
                <div>
                  <dt
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      'text-[10px] uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('trends.summary.deepShare', {}, { defaultValue: 'Deep share' })}
                  </dt>
                  <dd
                    className={cm.cn('text-3xl font-extrabold tracking-tight', cm.sp('mt', 1))}
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {deepPct}%
                  </dd>
                </div>
              </dl>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
