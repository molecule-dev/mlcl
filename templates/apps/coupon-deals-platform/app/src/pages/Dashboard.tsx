import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import type { TranslateFunction } from '@molecule/app-i18n'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { DealCard, type DealCardDeal } from '../components/DealCard.js'
import { HotDealsRow } from '../components/HotDealsRow.js'
import { SavingsKpiGrid } from '../components/SavingsKpiGrid.js'
import { TotalSavingsHero } from '../components/TotalSavingsHero.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface DashboardStats {
  total_savings_cents: number
  saved_count: number
  redeemed_count: number
  expiring_count: number
  top_merchants: { name: string; savings_cents: number }[]
  recent_activity: { id: string; text: string; ts: string }[]
}

function fmtUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function fmtRelative(iso: string, t: TranslateFunction): string {
  const d = new Date(iso)
  const diffH = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60))
  if (diffH < 1) return t('time.justNow', {}, { defaultValue: 'just now' })
  if (diffH < 24) return t('time.hoursAgo', { hours: diffH }, { defaultValue: '{{hours}}h ago' })
  return t('time.daysAgo', { days: Math.floor(diffH / 24) }, { defaultValue: '{{days}}d ago' })
}

const ACTIVITY_GLYPH = (text: string): string => {
  if (text.toLowerCase().includes('redeemed')) return 'check_circle'
  if (text.toLowerCase().includes('saved')) return 'bookmark'
  if (text.toLowerCase().includes('expir')) return 'alarm'
  return 'local_offer'
}

export function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [trending, setTrending] = useState<DealCardDeal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadTick, setReloadTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([http.get('/reports/dashboard_stats'), http.get('/deals').catch(() => null)])
      .then(([sRes, dRes]) => {
        if (cancelled) return
        setStats(unwrapSingle<DashboardStats>(sRes))
        setTrending(unwrapList<DealCardDeal>(dRes).slice(0, 4))
      })
      .catch(() => {
        if (!cancelled)
          setError(
            t('nav.failedToLoadDashboard', {}, { defaultValue: 'Failed to load dashboard.' }),
          )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t, reloadTick])

  if (loading)
    return (
      <div className={cm.cn(cm.sp('p', 8), 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </div>
    )
  if (error || !stats)
    return (
      <div
        className={cm.cn(
          cm.sp('p', 8),
          cm.flex({ direction: 'col', align: 'center', gap: 'md' }),
          'text-error',
        )}
      >
        <p role="alert">{error ?? t('dashboard.empty', {}, { defaultValue: 'No data.' })}</p>
        <button
          type="button"
          onClick={() => setReloadTick((n) => n + 1)}
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            'rounded-full border border-outline-variant text-on-surface hover:bg-surface-container transition-colors',
          )}
        >
          {t('common.retry', {}, { defaultValue: 'Retry' })}
        </button>
      </div>
    )

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-8')}>
      <TotalSavingsHero
        totalSavingsCents={stats.total_savings_cents}
        redeemedCount={stats.redeemed_count}
        savedCount={stats.saved_count}
      />

      <SavingsKpiGrid stats={stats} />

      <HotDealsRow
        eyebrow={t('dashboard.trendingEyebrow', {}, { defaultValue: 'Trending now' })}
        heading={t('dashboard.trendingHeading', {}, { defaultValue: 'Hot deals near you' })}
        viewAllTo="/deals"
      >
        {trending.map((deal) => (
          <DealCard key={deal.id} deal={deal} />
        ))}
      </HotDealsRow>

      <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 lg:grid-cols-2')}>
        <section
          className={cm.cn(
            cm.sp('p', 6),
            'rounded-xl bg-surface-container-lowest shadow-sm border border-outline-variant/30',
          )}
        >
          <header className={cm.cn(cm.sp('mb', 4))}>
            <p className={cm.cn('text-[10px] font-black uppercase tracking-widest text-secondary')}>
              {t('dashboard.topMerchantsEyebrow', {}, { defaultValue: 'Lifetime' })}
            </p>
            <h2
              className={cm.cn(
                cm.sp('mt', 1),
                cm.textSize('xl'),
                cm.fontWeight('extrabold'),
                'tracking-tight',
              )}
            >
              {t('dashboard.topMerchantsHeading', {}, { defaultValue: 'Top-saving merchants' })}
            </h2>
          </header>
          <ul className={cm.cn('space-y-3')}>
            {stats.top_merchants.length === 0 ? (
              <li className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'dashboard.noMerchantsYet',
                  {},
                  { defaultValue: 'Save your first coupon to start tracking merchants.' },
                )}
              </li>
            ) : (
              stats.top_merchants.map((m, idx) => {
                const max = Math.max(...stats.top_merchants.map((x) => x.savings_cents), 1)
                const pct = Math.round((m.savings_cents / max) * 100)
                return (
                  <li key={m.name} className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
                    <span
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'center' }),
                        'h-8 w-8 rounded-full bg-primary/15 text-primary font-extrabold text-sm tabular-nums',
                      )}
                    >
                      {idx + 1}
                    </span>
                    <div className={cm.cn('flex-1 min-w-0')}>
                      <div className={cm.cn(cm.flex({ align: 'baseline', justify: 'between' }))}>
                        <span
                          className={cm.cn(
                            cm.textSize('sm'),
                            cm.fontWeight('semibold'),
                            'truncate',
                          )}
                        >
                          {m.name}
                        </span>
                        <span
                          className={cm.cn(
                            cm.textSize('sm'),
                            cm.fontWeight('extrabold'),
                            'tabular-nums text-primary',
                          )}
                        >
                          {fmtUsd(m.savings_cents)}
                        </span>
                      </div>
                      <div
                        className={cm.cn(
                          cm.sp('mt', 2),
                          'h-1.5 w-full rounded-full bg-surface-container overflow-hidden',
                        )}
                      >
                        <div
                          className={cm.cn(
                            'h-full rounded-full bg-gradient-to-r from-primary to-primary-container',
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </li>
                )
              })
            )}
          </ul>
        </section>

        <section
          className={cm.cn(
            cm.sp('p', 6),
            'rounded-xl bg-surface-container-lowest shadow-sm border border-outline-variant/30',
          )}
        >
          <header
            className={cm.cn(cm.flex({ align: 'baseline', justify: 'between' }), cm.sp('mb', 4))}
          >
            <div>
              <p
                className={cm.cn('text-[10px] font-black uppercase tracking-widest text-tertiary')}
              >
                {t('dashboard.recentEyebrow', {}, { defaultValue: 'Latest' })}
              </p>
              <h2
                className={cm.cn(
                  cm.sp('mt', 1),
                  cm.textSize('xl'),
                  cm.fontWeight('extrabold'),
                  'tracking-tight',
                )}
              >
                {t('nav.recentActivity', {}, { defaultValue: 'Recent activity' })}
              </h2>
            </div>
            <Link
              to="/notifications"
              className={cm.cn(
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'text-primary hover:underline',
              )}
            >
              {t('dashboard.allActivity', {}, { defaultValue: 'See all' })}
            </Link>
          </header>
          <ol className={cm.cn('space-y-3')}>
            {stats.recent_activity.length === 0 ? (
              <li className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'dashboard.noActivityYet',
                  {},
                  { defaultValue: 'Nothing yet — save a deal and your activity shows up here.' },
                )}
              </li>
            ) : (
              stats.recent_activity.map((ev) => (
                <li key={ev.id} className={cm.cn(cm.flex({ align: 'start', gap: 'md' }))}>
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      'h-9 w-9 shrink-0 rounded-full bg-secondary/15 text-secondary',
                    )}
                    aria-hidden="true"
                  >
                    <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-lg')}>
                      {ACTIVITY_GLYPH(ev.text)}
                    </span>
                  </span>
                  <div className={cm.cn('flex-1 min-w-0')}>
                    <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>{ev.text}</p>
                    <p
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.sp('mt', 1),
                        'text-on-surface-variant',
                      )}
                    >
                      {fmtRelative(ev.ts, t)}
                    </p>
                  </div>
                </li>
              ))
            )}
          </ol>
        </section>
      </div>
    </div>
  )
}
