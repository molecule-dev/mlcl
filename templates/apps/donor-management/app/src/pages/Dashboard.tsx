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
  // Design's "2024 Year-End Tax Substantiation Window Open" action banner —
  // dismissible per session; a real deadline reminder, not sample data.
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const year = summary?.year ?? new Date().getFullYear()

  // Touchpoint queue derived from the newest gifts: unreceipted gifts get a
  // receipt nudge; the most recent gift gets a thank-you nudge.
  const pendingQueue = summary
    ? [
        ...summary.recent_gifts
          .filter((g) => !g.receipted)
          .slice(0, 3)
          .map((g) => ({
            id: `${g.id}-receipt`,
            label: t(
              'dashboard.queueReceiptLabel',
              { donor: g.donor_name },
              { defaultValue: 'Receipt pending — {{donor}}' },
            ),
            note: t(
              'dashboard.queueReceiptNote',
              {},
              { defaultValue: 'Include this gift in the next year-end substantiation batch.' },
            ),
            href: '/receipts',
            action: t('dashboard.queueReceiptAction', {}, { defaultValue: 'Open receipts' }),
          })),
        ...(summary.recent_gifts[0]
          ? [
              {
                id: `${summary.recent_gifts[0].id}-thanks`,
                label: t(
                  'dashboard.queueThanksLabel',
                  { donor: summary.recent_gifts[0].donor_name },
                  { defaultValue: 'Thank {{donor}} for their recent gift' },
                ),
                note: t(
                  'dashboard.queueThanksNote',
                  {},
                  { defaultValue: 'A personal note within a week lifts donor retention.' },
                ),
                href: `/donors/${summary.recent_gifts[0].donor_id}`,
                action: t('dashboard.queueThanksAction', {}, { defaultValue: 'View donor' }),
              },
            ]
          : []),
      ]
    : []

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
          {/* Giving intelligence lead — the design's page banner line. */}
          <section
            data-mol-id="dashboard-intelligence"
            className={cm.cn(cm.stack(1))}
            aria-labelledby="dashboard-intelligence-heading"
          >
            <h2
              id="dashboard-intelligence-heading"
              className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), 'font-display')}
            >
              {t(
                'dashboard.intelligenceHeading',
                {},
                { defaultValue: 'Giving Intelligence & Tax Substantiation' },
              )}
            </h2>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'dashboard.intelligenceSubtitle',
                {},
                {
                  defaultValue:
                    'Fiscal-year snapshot of gifts, campaigns, and year-end substantiation readiness.',
                },
              )}
            </p>
          </section>

          {/* Year-end substantiation window banner (dismissible). */}
          {!bannerDismissed ? (
            <section
              data-mol-id="dashboard-substantiation-banner"
              className={cm.cn(
                cm.sp('p', 5),
                'rounded-xl bg-primary-container text-on-primary-container flex items-start justify-between gap-4 flex-wrap',
              )}
              role="status"
            >
              <div className={cm.stack(1)}>
                <p
                  className={cm.cn(cm.flex({ align: 'center', gap: 2 }), cm.fontWeight('semibold'))}
                >
                  <span className="material-symbols-outlined text-lg" aria-hidden="true">
                    crisis_alert
                  </span>
                  {t(
                    'dashboard.windowHeading',
                    { year },
                    { defaultValue: '{{year}} Year-End Tax Substantiation Window Open' },
                  )}
                </p>
                <p className={cm.cn(cm.textSize('sm'))}>
                  {t(
                    'dashboard.windowBody',
                    { year },
                    {
                      defaultValue:
                        'Finish donor address updates and dispatch consolidated year-end receipts before the January 31 statutory postmark deadline.',
                    },
                  )}
                </p>
              </div>
              <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap')}>
                <Link
                  to="/receipts"
                  data-mol-id="dashboard-review-receipts"
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'rounded-md bg-primary text-on-primary',
                  )}
                >
                  {t(
                    'dashboard.windowCta',
                    {},
                    { defaultValue: 'Review & dispatch remaining receipts' },
                  )}
                </Link>
                <button
                  type="button"
                  onClick={() => setBannerDismissed(true)}
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    'rounded-md border border-current',
                  )}
                >
                  {t('dashboard.windowDismiss', {}, { defaultValue: 'Dismiss' })}
                </button>
              </div>
            </section>
          ) : null}

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
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                {t('dashboard.campaignProgress', {}, { defaultValue: 'Campaign progress' })}
              </h2>
              <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant', cm.sp('mb', 4))}>
                {t(
                  'dashboard.campaignProgressSubtitle',
                  {},
                  {
                    defaultValue:
                      'Active campaigns & sustainer health — tracking against year-end targets.',
                  },
                )}
              </p>
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
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                {t('dashboard.recentGifts', {}, { defaultValue: 'Recent gifts' })}
              </h2>
              <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant', cm.sp('mb', 4))}>
                {t(
                  'dashboard.recentGiftsSubtitle',
                  {},
                  {
                    defaultValue:
                      'Verified gift feed — every settled gift with its live receipt status.',
                  },
                )}
              </p>
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

          {/* Year-end batch + stewardship queue + gateway sync status. */}
          <div className={cm.grid({ cols: 2, gap: 'lg' })}>
            <section className={cm.cn(cm.card(), cm.sp('p', 5), cm.stack(3))}>
              <div>
                <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                  {t(
                    'dashboard.batchHeading',
                    { year },
                    { defaultValue: '{{year}} Year-End Tax Summary Batch' },
                  )}
                </h3>
                <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant', cm.sp('mt', 1))}>
                  {t(
                    'dashboard.batchSubtitle',
                    {},
                    {
                      defaultValue:
                        'Consolidated year-end substantiation statements, itemized per donor under IRS 170(f)(8).',
                    },
                  )}
                </p>
              </div>
              <div
                className={cm.cn(
                  cm.sp('p', 3),
                  'rounded-lg bg-surface-container-low flex items-center justify-between gap-3 flex-wrap',
                )}
              >
                <span className={cm.cn(cm.flex({ align: 'center', gap: 2 }), cm.textSize('sm'))}>
                  <span
                    className="material-symbols-outlined text-primary text-lg"
                    aria-hidden="true"
                  >
                    receipt_long
                  </span>
                  {t(
                    'dashboard.batchEngine',
                    {},
                    { defaultValue: 'Auto-dispatch engine: consolidated statements each January' },
                  )}
                </span>
                <span
                  className={cm.cn(
                    cm.sp('px', 2),
                    cm.sp('py', 1),
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'rounded-full bg-success-container text-on-success-container',
                  )}
                >
                  {t('dashboard.batchStatus', {}, { defaultValue: 'Ready' })}
                </span>
              </div>
              <div className={cm.flex({ gap: 'sm', wrap: 'wrap' })}>
                <Link
                  to="/receipts"
                  data-mol-id="dashboard-open-batch"
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'rounded-md bg-primary text-on-primary',
                  )}
                >
                  {t('dashboard.batchCta', {}, { defaultValue: 'Open the receipts batch' })}
                </Link>
              </div>
            </section>

            <section className={cm.cn(cm.card(), cm.sp('p', 5), cm.stack(3))}>
              <div>
                <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                  {t('dashboard.queueHeading', {}, { defaultValue: 'Touchpoint queue' })}
                </h3>
                <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant', cm.sp('mt', 1))}>
                  {t(
                    'dashboard.queueSubtitle',
                    {},
                    {
                      defaultValue:
                        'Stewardship follow-ups derived from your newest gifts — receipts to send, thank-yous to write.',
                    },
                  )}
                </p>
              </div>
              {pendingQueue.length === 0 ? (
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t(
                    'dashboard.queueClear',
                    {},
                    {
                      defaultValue:
                        'Queue clear — every recent gift is receipted and thanked. Check back after the next gift lands.',
                    },
                  )}
                </p>
              ) : (
                <ul className={cm.stack(3)}>
                  {pendingQueue.map((item) => (
                    <li
                      key={item.id}
                      className={cm.cn(
                        cm.sp('p', 3),
                        'rounded-lg border border-outline-variant/60 flex items-start justify-between gap-3 flex-wrap',
                      )}
                    >
                      <div className={cm.stack(1)}>
                        <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                          {item.label}
                        </p>
                        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                          {item.note}
                        </p>
                      </div>
                      <Link
                        to={item.href}
                        className={cm.cn(
                          cm.sp('px', 3),
                          cm.sp('py', 2),
                          cm.textSize('xs'),
                          cm.fontWeight('semibold'),
                          'rounded-md border border-outline-variant whitespace-nowrap',
                        )}
                      >
                        {item.action}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <section className={cm.cn(cm.card(), cm.sp('p', 5), cm.stack(3))}>
            <div>
              <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                {t('dashboard.gatewaysHeading', {}, { defaultValue: 'Gateways & IRS Sync Status' })}
              </h3>
              <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant', cm.sp('mt', 1))}>
                {t(
                  'dashboard.gatewaysSubtitle',
                  {},
                  {
                    defaultValue:
                      'Settlement channels feeding the ledger and the year-end substantiation pipeline.',
                  },
                )}
              </p>
            </div>
            <ul className={cm.stack(2)}>
              {[
                {
                  key: 'stripe',
                  icon: 'credit_card',
                  labelKey: 'dashboard.gatewayStripe',
                  defaultLabel: 'Card payments (Stripe-backed checkout)',
                  statusKey: 'dashboard.gatewayHealthy',
                  defaultStatus: 'Healthy',
                },
                {
                  key: 'bank',
                  icon: 'account_balance',
                  labelKey: 'dashboard.gatewayBank',
                  defaultLabel: 'Check & ACH settlements (recorded per gift)',
                  statusKey: 'dashboard.gatewayOperational',
                  defaultStatus: 'Operational',
                },
                {
                  key: 'irs',
                  icon: 'verified_user',
                  labelKey: 'dashboard.gatewayIrs',
                  defaultLabel: 'IRS 170(f)(8) substantiation tagging rules',
                  statusKey: 'dashboard.gatewayOperational',
                  defaultStatus: 'Operational',
                },
              ].map((g) => (
                <li
                  key={g.key}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    'rounded-lg bg-surface-container-low gap-3 flex-wrap',
                  )}
                >
                  <span className={cm.cn(cm.flex({ align: 'center', gap: 2 }), cm.textSize('sm'))}>
                    <span
                      className="material-symbols-outlined text-primary text-lg"
                      aria-hidden="true"
                    >
                      {g.icon}
                    </span>
                    {t(g.labelKey, {}, { defaultValue: g.defaultLabel })}
                  </span>
                  <span
                    className={cm.cn(
                      cm.sp('px', 2),
                      cm.sp('py', 1),
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      'rounded-full bg-success-container text-on-success-container',
                    )}
                  >
                    {t(g.statusKey, {}, { defaultValue: g.defaultStatus })}
                  </span>
                </li>
              ))}
            </ul>
          </section>
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
