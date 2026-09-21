import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { formatMoney } from '../lib/format.js'
import { unwrapSingle } from '../lib/unwrap.js'
import type { DashboardSummary } from '../types.js'

export function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/dashboard/summary')
      .then((res) => {
        if (!cancelled) setSummary(unwrapSingle<DashboardSummary>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('dashboard.loadError', {}, { defaultValue: 'Failed to load the dashboard.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, 'space-y-6')}>
      <header
        className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), 'flex-wrap gap-4')}
      >
        <div className="min-w-0">
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
            {t('dashboard.heading', {}, { defaultValue: 'Dashboard' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'dashboard.subheading',
              { year: summary?.year ?? new Date().getFullYear() },
              { defaultValue: 'Fundraising snapshot for {{year}}' },
            )}
          </p>
        </div>
        <div className={cm.cn(cm.flex({ gap: 'sm' }), 'flex-wrap')}>
          <Link
            to="/gifts/new"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'bg-primary text-on-primary rounded-md',
            )}
          >
            + {t('dashboard.recordGift', {}, { defaultValue: 'Record gift' })}
          </Link>
          <Link
            to="/receipts"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              'border border-outline-variant rounded-md',
            )}
          >
            {t('dashboard.runReceipts', {}, { defaultValue: 'Year-end receipts' })}
          </Link>
        </div>
      </header>

      {error ? (
        <div
          className={cm.cn(
            cm.sp('p', 4),
            'rounded-lg bg-error-container text-on-error-container flex items-center justify-between gap-3 flex-wrap',
          )}
          role="alert"
        >
          <p>{error}</p>
          <button
            type="button"
            onClick={() => {
              setError(null)
              setLoading(true)
              http
                .get('/dashboard/summary')
                .then((res) => setSummary(unwrapSingle<DashboardSummary>(res)))
                .catch(() =>
                  setError(
                    t('dashboard.loadError', {}, { defaultValue: 'Failed to load the dashboard.' }),
                  ),
                )
                .finally(() => setLoading(false))
            }}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'border border-current rounded-md',
            )}
          >
            {t('common.retry', {}, { defaultValue: 'Retry' })}
          </button>
        </div>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loading', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : !summary ? null : (
        <>
          <div className={cm.grid({ cols: 4, gap: 'md' })}>
            <Kpi
              label={t('dashboard.raisedYtd', {}, { defaultValue: 'Raised this year' })}
              value={formatMoney(summary.raised_ytd_cents)}
              tone="primary"
            />
            <Kpi
              label={t('dashboard.donorCount', {}, { defaultValue: 'Donors' })}
              value={String(summary.donor_count)}
              tone="info"
            />
            <Kpi
              label={t('dashboard.avgGift', {}, { defaultValue: 'Average gift' })}
              value={formatMoney(summary.avg_gift_cents)}
              tone="secondary"
            />
            <Kpi
              label={t('dashboard.giftsYtd', {}, { defaultValue: 'Gifts this year' })}
              value={String(summary.gifts_ytd)}
              tone="success"
            />
          </div>

          <div className={cm.grid({ cols: 2, gap: 'lg' })}>
            <section className={cm.cn(cm.card(), cm.sp('p', 5))}>
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), cm.sp('mb', 4))}>
                {t('dashboard.campaignProgress', {}, { defaultValue: 'Campaign progress' })}
              </h2>
              {summary.campaigns.length === 0 ? (
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t(
                    'dashboard.noCampaigns',
                    {},
                    { defaultValue: 'No campaigns yet — create one to track a goal.' },
                  )}
                </p>
              ) : (
                <ul className={cm.stack(4)}>
                  {summary.campaigns.map((c) => {
                    const pct =
                      c.goal_cents > 0
                        ? Math.min(100, Math.round((c.raised_cents / c.goal_cents) * 100))
                        : 0
                    return (
                      <li key={c.id}>
                        <div
                          className={cm.cn(
                            cm.flex({ align: 'center', justify: 'between' }),
                            'gap-2',
                          )}
                        >
                          <Link
                            to="/campaigns"
                            className={cm.cn(
                              cm.textSize('sm'),
                              cm.fontWeight('medium'),
                              'min-w-0 truncate',
                            )}
                          >
                            {c.name}
                          </Link>
                          <span
                            className={cm.cn(
                              cm.textSize('xs'),
                              'text-on-surface-variant whitespace-nowrap',
                            )}
                          >
                            {formatMoney(c.raised_cents)} / {formatMoney(c.goal_cents)} · {pct}%
                          </span>
                        </div>
                        <div
                          className={cm.cn(cm.sp('mt', 1), 'h-2 rounded-full bg-surface-container')}
                          role="progressbar"
                          aria-valuenow={pct}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={c.name}
                        >
                          <div
                            className={'h-2 rounded-full bg-primary'}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>

            <section className={cm.cn(cm.card(), cm.sp('p', 5))}>
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), cm.sp('mb', 4))}>
                {t('dashboard.recentGifts', {}, { defaultValue: 'Recent gifts' })}
              </h2>
              {summary.recent_gifts.length === 0 ? (
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t('dashboard.noGifts', {}, { defaultValue: 'No gifts recorded yet.' })}
                </p>
              ) : (
                <ul className={cm.stack(3)}>
                  {summary.recent_gifts.map((g) => (
                    <li key={g.id} className={cm.flex({ align: 'center', justify: 'between' })}>
                      <div>
                        <Link
                          to={`/donors/${g.donor_id}`}
                          className={cm.cn(
                            cm.textSize('sm'),
                            cm.fontWeight('medium'),
                            'inline-block py-1',
                          )}
                        >
                          {g.donor_name}
                        </Link>
                        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                          {g.gift_date} ·{' '}
                          {t(`gift.method.${g.method}`, {}, { defaultValue: g.method })}
                          {g.campaign_name ? ` · ${g.campaign_name}` : ''}
                        </p>
                      </div>
                      <Link
                        to={`/gifts/${g.id}`}
                        className={cm.cn(
                          cm.textSize('sm'),
                          cm.fontWeight('semibold'),
                          'inline-block py-1',
                        )}
                      >
                        {formatMoney(g.amount_cents)}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  )
}

function Kpi({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'primary' | 'info' | 'secondary' | 'success'
}) {
  const cm = getClassMap()
  const toneCls: Record<string, string> = {
    primary: 'bg-primary-container text-on-primary-container',
    info: 'bg-info-container text-on-info-container',
    secondary: 'bg-secondary-container text-on-secondary-container',
    success: 'bg-success-container text-on-success-container',
  }
  return (
    <div className={cm.cn(cm.sp('p', 5), 'rounded-xl', toneCls[tone] ?? toneCls['primary']!)}>
      <p
        className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'), 'uppercase tracking-wider')}
      >
        {label}
      </p>
      <p className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mt', 1))}>{value}</p>
    </div>
  )
}
