import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { type KitchenStat, KitchenStatTriad } from '../components/KitchenStatTriad.js'
import { RevenueHeroCard } from '../components/RevenueHeroCard.js'
import { unwrapSingle } from '../lib/unwrap.js'

interface AnalyticsSnapshot {
  todayRevenueCents: number
  coversCount: number
  avgCheckCents: number
  tipsAvgPct: number
  busiestHour: { hour: number; cents: number } | null
  firstSeating: string | null
  lastTicket: string | null
  hourly: ReadonlyArray<{ hour: number; cents: number }>
  topItems: ReadonlyArray<{ id: string | null; name: string; sold: number; grossCents: number }>
  orderCount: number
}

const formatHour = (hour: number) => `${hour.toString().padStart(2, '0')}:00`

function fmtCents(cents: number) {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

export function Analytics() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [data, setData] = useState<AnalyticsSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get('/api/analytics/snapshot')
      .then((res) => {
        if (cancelled) return
        const snap = unwrapSingle<AnalyticsSnapshot>(res)
        if (snap) setData(snap)
      })
      .catch(() => {
        if (!cancelled)
          setError(t('analytics.loadError', {}, { defaultValue: 'Could not load analytics.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const revenueCents = data?.todayRevenueCents ?? 0
  const hourBars = data?.hourly ?? []
  const max = Math.max(1, ...hourBars.map((h) => h.cents))
  const tipsAvgPct = data?.tipsAvgPct ?? 0
  const stats: KitchenStat[] = [
    {
      key: 'revenue',
      label: 'Revenue (today)',
      value: fmtCents(revenueCents),
      delta: t('status.today', {}, { defaultValue: 'Today' }),
      deltaDirection: 'neutral',
      icon: 'paid',
      tint: 'text-success',
    },
    {
      key: 'covers',
      label: 'Covers',
      value: String(data?.coversCount ?? 0),
      delta: t('status.today', {}, { defaultValue: 'Today' }),
      deltaDirection: 'neutral',
      icon: 'group',
      tint: 'text-primary',
    },
    {
      key: 'avgCheck',
      label: 'Avg check',
      value: fmtCents(data?.avgCheckCents ?? 0),
      delta: t('status.today', {}, { defaultValue: 'Today' }),
      deltaDirection: 'neutral',
      icon: 'receipt',
      tint: 'text-warning',
    },
    {
      key: 'busiest',
      label: 'Busiest hour',
      value:
        data?.busiestHour && data.busiestHour.cents > 0 ? formatHour(data.busiestHour.hour) : '—',
      delta:
        data?.busiestHour && data.busiestHour.cents > 0 ? fmtCents(data.busiestHour.cents) : '',
      deltaDirection: 'neutral',
      icon: 'autorenew',
      tint: 'text-tertiary',
    },
  ]

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(8))}>
      <header>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.sp('mb', 2),
            'uppercase tracking-widest text-primary',
          )}
        >
          {t('analytics.eyebrow', {}, { defaultValue: 'Service analytics' })}
        </p>
        <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight font-display')}>
          {t('analytics.heading', {}, { defaultValue: 'Today, by the numbers' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'analytics.subheading',
            {},
            { defaultValue: 'Revenue, top items, hourly demand from your real orders.' },
          )}
        </p>
      </header>

      {error ? (
        <p
          data-testid="analytics-error"
          className={cm.cn(cm.sp('py', 4), cm.textCenter, 'text-error')}
        >
          {error}
        </p>
      ) : null}

      {loading && !data ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('analytics.loading', {}, { defaultValue: 'Loading analytics…' })}
        </p>
      ) : (
        <>
          <section
            className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 lg:grid-cols-12 items-stretch')}
          >
            <RevenueHeroCard
              revenueCents={revenueCents}
              changeCents={0}
              history={hourBars.map((h) => ({ hour: formatHour(h.hour), cents: h.cents }))}
              activeOrders={data?.coversCount ?? 0}
            />
            <aside
              className={cm.cn(
                cm.flex({ direction: 'col', justify: 'between' }),
                cm.sp('p', 6),
                'lg:col-span-4 bg-surface-container-lowest rounded-2xl hover:shadow-2xl hover:shadow-on-surface/5 transition-all',
              )}
            >
              <div>
                <h3
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    cm.textSize('lg'),
                    cm.sp('mb', 6),
                    'font-display',
                  )}
                >
                  {t('analytics.shiftsHeading', {}, { defaultValue: 'Service rhythm' })}
                </h3>
                <dl className={cm.stack(4)}>
                  <Row
                    label={t('analytics.busiestHour', {}, { defaultValue: 'Busiest hour' })}
                    value={
                      data?.busiestHour && data.busiestHour.cents > 0
                        ? `${formatHour(data.busiestHour.hour)} · ${fmtCents(data.busiestHour.cents)}`
                        : '—'
                    }
                  />
                  <Row
                    label={t('analytics.coversToday', {}, { defaultValue: 'Covers today' })}
                    value={String(data?.coversCount ?? 0)}
                  />
                  <Row
                    label={t('analytics.avgCheckLabel', {}, { defaultValue: 'Avg check' })}
                    value={fmtCents(data?.avgCheckCents ?? 0)}
                  />
                  <Row
                    label={t('analytics.tipsAvgPct', {}, { defaultValue: 'Tips (avg)' })}
                    value={`${tipsAvgPct.toFixed(1)}%`}
                  />
                </dl>
              </div>
            </aside>
          </section>

          <KitchenStatTriad stats={stats} />

          <section className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 lg:grid-cols-3')}>
            <div
              className={cm.cn(
                cm.sp('p', 6),
                'lg:col-span-2 bg-surface-container-lowest rounded-2xl shadow-sm',
                cm.stack(4),
              )}
            >
              <h2
                className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight font-display')}
              >
                {t('analytics.hourlyHeading', {}, { defaultValue: 'Hourly revenue' })}
              </h2>
              {hourBars.length === 0 ? (
                <p
                  data-testid="analytics-no-hours"
                  className={cm.cn(cm.sp('py', 8), cm.textCenter, 'text-on-surface-variant')}
                >
                  {t('analytics.noHourly', {}, { defaultValue: 'No revenue recorded today yet.' })}
                </p>
              ) : (
                <div className={cm.cn(cm.flex({ align: 'end', gap: 'xs' }), 'h-48')}>
                  {hourBars.map((h) => (
                    <div
                      key={h.hour}
                      className={cm.cn(
                        cm.flex({ direction: 'col', align: 'center', justify: 'end' }),
                        'flex-1 group',
                      )}
                    >
                      <div
                        className={cm.cn(
                          'w-full rounded-t-md bg-gradient-to-t from-primary to-primary/40 transition-all group-hover:from-tertiary group-hover:to-tertiary/40',
                        )}
                        style={{ height: `${Math.max(8, (h.cents / max) * 100)}%` }}
                        aria-label={`${formatHour(h.hour)} — ${fmtCents(h.cents)}`}
                      />
                      <span
                        className={cm.cn(
                          cm.textSize('xs'),
                          cm.sp('mt', 1),
                          'text-on-surface-variant tabular-nums',
                        )}
                      >
                        {h.hour}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div
              className={cm.cn(
                cm.sp('p', 6),
                'bg-surface-container-lowest rounded-2xl shadow-sm',
                cm.stack(3),
              )}
            >
              <h2
                className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight font-display')}
              >
                {t('analytics.topItems', {}, { defaultValue: 'Top items today' })}
              </h2>
              {(data?.topItems ?? []).length === 0 ? (
                <p
                  data-testid="analytics-no-items"
                  className={cm.cn(cm.sp('py', 8), cm.textCenter, 'text-on-surface-variant')}
                >
                  {t('analytics.noTopItems', {}, { defaultValue: 'No items sold today yet.' })}
                </p>
              ) : (
                <ol className={cm.stack(3)}>
                  {(data?.topItems ?? []).slice(0, 5).map((it, i) => (
                    <li key={it.id ?? i} className={cm.flex({ align: 'center', gap: 'sm' })}>
                      <span
                        className={cm.cn(
                          cm.flex({ align: 'center', justify: 'center' }),
                          cm.w(8),
                          cm.h(8),
                          cm.roundedFull,
                          'bg-primary/10 text-primary font-extrabold tabular-nums',
                        )}
                      >
                        {i + 1}
                      </span>
                      <div className={cm.flex1}>
                        <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                          {it.name}
                        </p>
                        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                          {t(
                            'analytics.itemSold',
                            { count: it.sold },
                            { defaultValue: '{{count}} sold' },
                          )}
                        </p>
                      </div>
                      <span className={cm.cn(cm.textSize('sm'), 'font-bold tabular-nums')}>
                        {fmtCents(it.grossCents)}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  const cm = getClassMap()
  return (
    <div className={cm.flex({ align: 'center', justify: 'between' })}>
      <dt
        className={cm.cn('text-[11px] uppercase tracking-widest font-bold text-on-surface-variant')}
      >
        {label}
      </dt>
      <dd className={cm.cn(cm.textSize('base'), 'font-extrabold tabular-nums font-display')}>
        {value}
      </dd>
    </div>
  )
}
