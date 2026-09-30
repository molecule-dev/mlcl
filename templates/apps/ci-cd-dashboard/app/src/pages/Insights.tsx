import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapSingle } from '../lib/unwrap.js'

interface Insights {
  deploy_frequency_per_day: number
  lead_time_hours: number
  change_failure_rate_pct: number
  mttr_minutes: number
  success_rate_series: Array<{ date: string; pct: number }>
  slowest_steps: Array<{ name: string; mean_seconds: number; p95_seconds: number }>
  activity_heatmap: Array<{ day: string; hours: number[] }>
}

function fmtDur(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  return `${Math.floor(seconds / 60)}m${(seconds % 60).toString().padStart(2, '0')}s`
}

export function Insights() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [data, setData] = useState<Insights | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get('/api/insights')
      .then((res) => {
        if (!cancelled) setData(unwrapSingle<Insights>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('insights.loadError', {}, { defaultValue: 'Failed to load insights.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))}>
      <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), cm.sp('mb', 6))}>
        {t('insights.heading', {}, { defaultValue: 'Insights' })}
      </h1>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : !data ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('insights.empty', {}, { defaultValue: 'Not enough data yet.' })}
        </p>
      ) : (
        <div className={'space-y-6'}>
          <div className={cm.grid({ cols: 4, gap: 'md' })}>
            <Kpi
              icon="rocket_launch"
              label={t('insights.deployFrequency', {}, { defaultValue: 'Deploys / day' })}
              value={data.deploy_frequency_per_day.toFixed(1)}
            />
            <Kpi
              label={t('insights.leadTime', {}, { defaultValue: 'Lead time' })}
              value={`${data.lead_time_hours}h`}
            />
            <Kpi
              label={t('insights.changeFailureRate', {}, { defaultValue: 'Change failure rate' })}
              value={`${data.change_failure_rate_pct.toFixed(1)}%`}
            />
            <Kpi
              label={t('insights.mttr', {}, { defaultValue: 'MTTR' })}
              value={`${data.mttr_minutes}m`}
            />
          </div>

          <section
            className={cm.cn(cm.sp('p', 5), 'bg-surface rounded-md border border-outline-variant')}
          >
            <h2
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'uppercase tracking-wider text-on-surface-variant',
                cm.sp('mb', 3),
              )}
            >
              {t(
                'insights.successRateHeading',
                {},
                { defaultValue: 'Pipeline success rate (last 14 days)' },
              )}
            </h2>
            <div className={'flex items-end gap-1 h-32'}>
              {data.success_rate_series.map((d) => (
                <div
                  key={d.date}
                  className={'flex-1 flex flex-col items-center justify-end'}
                  title={`${d.date}: ${d.pct.toFixed(1)}%`}
                >
                  <span
                    className={'w-full bg-primary rounded-t-sm'}
                    style={{ height: `${d.pct}%` }}
                    aria-hidden="true"
                  />
                </div>
              ))}
            </div>
          </section>

          <section
            className={cm.cn(cm.sp('p', 5), 'bg-surface rounded-md border border-outline-variant')}
          >
            <h2
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'uppercase tracking-wider text-on-surface-variant',
                cm.sp('mb', 3),
              )}
            >
              {t('insights.slowestStepsHeading', {}, { defaultValue: 'Slowest pipeline steps' })}
            </h2>
            <ul className={'space-y-2 text-sm'}>
              {data.slowest_steps.map((s, i) => (
                <li
                  key={s.name}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.sp('py', 1),
                  )}
                >
                  <span className={cm.flex({ align: 'center', gap: 'sm' })}>
                    <span
                      className={cm.cn(cm.textSize('xs'), 'font-mono text-on-surface-variant w-6')}
                    >
                      #{i + 1}
                    </span>
                    <span className="font-mono">{s.name}</span>
                  </span>
                  <span className={cm.cn('font-mono text-xs text-on-surface-variant')}>
                    {t(
                      'insights.meanP95',
                      { mean: fmtDur(s.mean_seconds), p95: fmtDur(s.p95_seconds) },
                      { defaultValue: 'mean {{mean}} · p95 {{p95}}' },
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  )
}

function Kpi({ label, value, icon }: { label: string; value: string; icon?: string }) {
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.sp('p', 5), 'bg-surface rounded-md border border-outline-variant')}>
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mb', 1))}>
        {icon ? (
          <span
            className={cm.cn(
              'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
              'bg-surface-secondary text-primary',
            )}
            aria-hidden="true"
          >
            <span className={'material-symbols-outlined text-base leading-none'}>{icon}</span>
          </span>
        ) : null}
        <p className={cm.cn(cm.textSize('xs'), 'uppercase tracking-wider text-on-surface-variant')}>
          {label}
        </p>
      </div>
      <p className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'font-mono')}>{value}</p>
    </div>
  )
}
