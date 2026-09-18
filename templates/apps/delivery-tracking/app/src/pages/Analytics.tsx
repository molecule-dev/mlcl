import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapSingle } from '../lib/unwrap.js'

interface Analytics {
  on_time_rate_overall: number
  on_time_rate_change: number
  exception_rate_overall: number
  exception_rate_change: number
  avg_transit_hours: number
  total_shipments_30d: number
  by_carrier: { carrier: string; on_time_rate: number; exception_rate: number; shipments: number }[]
  by_status_30d: { status: string; count: number; pct: number }[]
  daily_volume: { date: string; volume: number; on_time_volume: number }[]
}

const STATUS_COLOR: Record<string, string> = {
  delivered: 'var(--color-status-delivered)',
  in_transit: 'var(--color-status-in-transit)',
  out_for_delivery: 'var(--color-status-out-delivery)',
  exception: 'var(--color-status-exception)',
  pending: 'var(--color-status-pending)',
}

export function Analytics() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [data, setData] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/reports/analytics')
      .then((res) => {
        if (!cancelled) setData(unwrapSingle<Analytics>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('analytics.loadError', {}, { defaultValue: 'Failed to load analytics.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  if (error) return <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
  if (loading)
    return (
      <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </p>
    )
  if (!data) return null

  const maxDaily = Math.max(...data.daily_volume.map((d) => d.volume), 1)

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('6xl'), cm.mxAuto, 'space-y-6')}>
      <header>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
          {t('nav.analytics', {}, { defaultValue: 'Analytics' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t('status.last30Days', {}, { defaultValue: 'Last 30 days' })}
        </p>
      </header>

      <section className={cm.grid({ cols: 4, gap: 'md' })}>
        <Kpi
          label={t('analytics.kpi.onTime', {}, { defaultValue: 'On-time rate' })}
          value={`${Math.round(data.on_time_rate_overall * 100)}%`}
          delta={data.on_time_rate_change}
          accent
        />
        <Kpi
          label={t('analytics.kpi.exceptions', {}, { defaultValue: 'Exception rate' })}
          value={`${(data.exception_rate_overall * 100).toFixed(1)}%`}
          delta={data.exception_rate_change}
          warn={data.exception_rate_overall > 0.02}
        />
        <Kpi
          label={t('analytics.kpi.transit', {}, { defaultValue: 'Avg transit' })}
          value={`${data.avg_transit_hours}h`}
        />
        <Kpi
          label={t('analytics.kpi.volume', {}, { defaultValue: 'Volume (30d)' })}
          value={data.total_shipments_30d.toLocaleString()}
        />
      </section>

      <section className={cm.cn(cm.card(), cm.sp('p', 5))}>
        <h2
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'uppercase tracking-wider',
            'text-on-surface-variant',
            cm.sp('mb', 4),
          )}
        >
          {t('analytics.dailyHeading', {}, { defaultValue: 'Daily volume' })}
        </h2>
        <div className={cm.flex({ align: 'end', gap: 'xs' })} style={{ height: '180px' }}>
          {data.daily_volume.map((d) => {
            const totalPct = (d.volume / maxDaily) * 100
            const onTimePct = d.volume > 0 ? d.on_time_volume / d.volume : 0
            return (
              <div
                key={d.date}
                className={cm.flex({ direction: 'col', align: 'center' })}
                style={{ flex: 1, height: '100%' }}
              >
                <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end' }}>
                  <div
                    style={{
                      width: '100%',
                      height: `${totalPct}%`,
                      backgroundColor: 'var(--color-status-exception)',
                      borderRadius: '3px 3px 0 0',
                      minHeight: '2px',
                      position: 'relative',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: `${onTimePct * 100}%`,
                        backgroundColor: 'var(--mol-color-primary)',
                        borderRadius: onTimePct >= 1 ? '3px 3px 0 0' : '0',
                      }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className={cm.grid({ cols: 2, gap: 'md' })}>
        <div className={cm.cn(cm.card(), cm.sp('p', 5))}>
          <h2
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'uppercase tracking-wider',
              'text-on-surface-variant',
              cm.sp('mb', 3),
            )}
          >
            {t('analytics.byCarrierHeading', {}, { defaultValue: 'On-time rate by carrier' })}
          </h2>
          <ul className={'space-y-3'}>
            {data.by_carrier.map((c) => (
              <li key={c.carrier}>
                <div className={cm.flex({ align: 'center', justify: 'between' })}>
                  <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                    {c.carrier}
                  </span>
                  <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                    {Math.round(c.on_time_rate * 100)}%
                    <span
                      className={cm.cn(
                        cm.textSize('xs'),
                        'text-on-surface-variant',
                        cm.fontWeight('normal'),
                        cm.sp('ml', 2),
                      )}
                    >
                      ({c.shipments})
                    </span>
                  </span>
                </div>
                <div
                  className={cm.cn('w-full', cm.sp('mt', 1))}
                  style={{
                    height: '6px',
                    backgroundColor: 'var(--mol-color-background-tertiary)',
                    borderRadius: '3px',
                  }}
                >
                  <div
                    style={{
                      width: `${Math.round(c.on_time_rate * 100)}%`,
                      height: '100%',
                      backgroundColor:
                        c.on_time_rate >= 0.95
                          ? 'var(--color-status-delivered)'
                          : c.on_time_rate >= 0.85
                            ? 'var(--color-status-out-delivery)'
                            : 'var(--color-status-exception)',
                      borderRadius: '3px',
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className={cm.cn(cm.card(), cm.sp('p', 5))}>
          <h2
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'uppercase tracking-wider',
              'text-on-surface-variant',
              cm.sp('mb', 3),
            )}
          >
            {t('analytics.byStatusHeading', {}, { defaultValue: 'Status mix (30d)' })}
          </h2>
          <ul className={'space-y-2'}>
            {data.by_status_30d.map((s) => (
              <li key={s.status}>
                <div className={cm.flex({ align: 'center', justify: 'between' })}>
                  <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                    {t(
                      `analytics.status.${s.status}`,
                      {},
                      { defaultValue: s.status.replace('_', ' ') },
                    )}
                  </span>
                  <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {s.count}
                  </span>
                </div>
                <div
                  className={cm.cn('w-full', cm.sp('mt', 1))}
                  style={{
                    height: '6px',
                    backgroundColor: 'var(--mol-color-background-tertiary)',
                    borderRadius: '3px',
                  }}
                >
                  <div
                    style={{
                      width: `${s.pct * 100}%`,
                      height: '100%',
                      backgroundColor: STATUS_COLOR[s.status] ?? 'var(--mol-color-primary)',
                      borderRadius: '3px',
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  )
}

function Kpi({
  label,
  value,
  delta,
  accent,
  warn,
}: {
  label: string
  value: string
  delta?: number
  accent?: boolean
  warn?: boolean
}) {
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.card(), cm.sp('p', 5))}>
      <p
        className={cm.cn(
          cm.textSize('xs'),
          'text-on-surface-variant',
          cm.fontWeight('medium'),
          'uppercase tracking-wider',
        )}
      >
        {label}
      </p>
      <p
        className={cm.cn(
          cm.textSize('3xl'),
          cm.fontWeight('bold'),
          cm.sp('mt', 1),
          accent ? cm.textPrimary : warn ? 'text-error' : '',
        )}
      >
        {value}
      </p>
      {typeof delta === 'number' ? (
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.sp('mt', 1),
            delta >= 0 ? 'text-success' : 'text-error',
          )}
        >
          {delta >= 0 ? '↑' : '↓'} {Math.abs(delta).toFixed(1)}%
        </p>
      ) : null}
    </div>
  )
}
