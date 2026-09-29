import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { formatMoney } from '../lib/format.js'
import { unwrapList } from '../lib/unwrap.js'
import type { Campaign, Gift } from '../types.js'

export function Campaigns() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [list, setList] = useState<Campaign[]>([])
  const [gifts, setGifts] = useState<Gift[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      http.get('/campaigns').then((res) => unwrapList<Campaign>(res)),
      http.get('/api/gifts').then((res) => unwrapList<Gift>(res)),
    ])
      .then(([campaigns, allGifts]) => {
        if (cancelled) return
        setList(campaigns)
        setGifts(allGifts)
      })
      .catch(() => {
        if (!cancelled)
          setError(t('campaigns.loadError', {}, { defaultValue: 'Failed to load campaigns.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  // Top stewardship cohorts — the campaigns with the deepest donor rosters.
  const topCohorts = useMemo(
    () => [...list].sort((a, b) => b.gift_count - a.gift_count).slice(0, 3),
    [list],
  )
  // Newest gifts that carry a campaign attribution.
  const recentContributions = useMemo(
    () => gifts.filter((g) => g.campaign_id && g.campaign_name).slice(0, 5),
    [gifts],
  )

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, 'space-y-6')}>
      <header>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
          {t('campaigns.heading', {}, { defaultValue: 'Campaigns' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'campaigns.subheading',
            {},
            {
              defaultValue:
                'Goals with raised-to-date derived from recorded gifts — record a gift against a campaign and the bar moves.',
            },
          )}
        </p>
      </header>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loading', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : list.length === 0 ? (
        <p className={cm.cn(cm.card(), cm.sp('p', 12), cm.textCenter, 'text-on-surface-variant')}>
          {t('campaigns.empty', {}, { defaultValue: 'No campaigns yet.' })}
        </p>
      ) : (
        <ul className={cm.grid({ cols: 2, gap: 'lg' })}>
          {list.map((c) => {
            const pct =
              c.goal_cents > 0
                ? Math.min(100, Math.round((c.raised_cents / c.goal_cents) * 100))
                : 0
            return (
              <li key={c.id} className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
                <div className={cm.flex({ align: 'start', justify: 'between' })}>
                  <div>
                    <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                      {c.name}
                    </h2>
                    <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {c.starts_on ?? '—'} →{' '}
                      {c.ends_on ?? t('campaigns.ongoing', {}, { defaultValue: 'ongoing' })}
                    </p>
                  </div>
                  <span
                    className={cm.cn(
                      cm.sp('px', 2),
                      cm.sp('py', 1),
                      cm.textSize('xs'),
                      'rounded-full whitespace-nowrap',
                      c.status === 'active'
                        ? 'bg-success-container text-on-success-container'
                        : c.status === 'completed'
                          ? 'bg-info-container text-on-info-container'
                          : 'bg-surface-container text-on-surface-variant',
                    )}
                  >
                    {t(`campaign.status.${c.status}`, {}, { defaultValue: c.status })}
                  </span>
                </div>
                {c.description ? (
                  <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                    {c.description}
                  </p>
                ) : null}
                <div>
                  <div className={cm.flex({ align: 'center', justify: 'between' })}>
                    <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                      {formatMoney(c.raised_cents)}
                    </span>
                    <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {t(
                        'campaigns.ofGoal',
                        { goal: formatMoney(c.goal_cents) },
                        { defaultValue: 'of {{goal}}' },
                      )}{' '}
                      · {pct}%
                    </span>
                  </div>
                  <div
                    className={cm.cn(cm.sp('mt', 1), 'h-3 rounded-full bg-surface-container')}
                    role="progressbar"
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={c.name}
                  >
                    <div className={'h-3 rounded-full bg-primary'} style={{ width: `${pct}%` }} />
                  </div>
                  <p
                    className={cm.cn(cm.textSize('xs'), cm.sp('mt', 1), 'text-on-surface-variant')}
                  >
                    {t(
                      'campaigns.giftCount',
                      { count: c.gift_count },
                      { defaultValue: '{{count}} gifts' },
                    )}
                  </p>
                </div>
                <Link
                  to={`/gifts?campaign_id=${c.id}`}
                  className={cm.cn(
                    cm.textSize('sm'),
                    'text-primary hover:underline inline-block py-1',
                  )}
                >
                  {t('campaigns.viewGifts', {}, { defaultValue: 'View gifts →' })}
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      {list.length > 0 ? (
        <div className={cm.grid({ cols: 2, gap: 'lg' })}>
          <section className={cm.cn(cm.card(), cm.sp('p', 5), cm.stack(3))}>
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
              {t(
                'campaigns.cohortsHeading',
                {},
                { defaultValue: 'Top Stewardship Cohorts by Campaign' },
              )}
            </h2>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t(
                'campaigns.cohortsSubtitle',
                {},
                {
                  defaultValue:
                    'The campaigns with the deepest donor rosters — where stewardship attention pays off first.',
                },
              )}
            </p>
            <ol className={cm.stack(3)}>
              {topCohorts.map((c, i) => (
                <li key={c.id} className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      'w-7 h-7 rounded-full bg-surface-container text-primary shrink-0',
                    )}
                    aria-hidden="true"
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <Link
                      to={`/gifts?campaign_id=${c.id}`}
                      className={cm.cn(
                        cm.textSize('sm'),
                        cm.fontWeight('medium'),
                        'block truncate',
                      )}
                    >
                      {c.name}
                    </Link>
                    <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {t(
                        'campaigns.cohortDonors',
                        { count: c.gift_count },
                        { defaultValue: '{{count}} contributing donors' },
                      )}
                    </span>
                  </span>
                  <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                    {formatMoney(c.raised_cents)}
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <section className={cm.cn(cm.card(), cm.sp('p', 5), cm.stack(3))}>
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
              {t('campaigns.recentHeading', {}, { defaultValue: 'Recent Campaign Contributions' })}
            </h2>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t(
                'campaigns.recentSubtitle',
                {},
                {
                  defaultValue:
                    'The newest gifts carrying a campaign attribution across every active appeal.',
                },
              )}
            </p>
            {recentContributions.length === 0 ? (
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'campaigns.recentEmpty',
                  {},
                  {
                    defaultValue:
                      'No campaign-attributed gifts yet — record a gift against a campaign and it shows up here.',
                  },
                )}
              </p>
            ) : (
              <ul className={cm.stack(3)}>
                {recentContributions.map((g) => (
                  <li
                    key={g.id}
                    className={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}
                  >
                    <span className="min-w-0">
                      <Link
                        to={`/gifts/${g.id}`}
                        className={cm.cn(
                          cm.textSize('sm'),
                          cm.fontWeight('medium'),
                          'block truncate',
                        )}
                      >
                        {g.donor_name}
                      </Link>
                      <span
                        className={cm.cn(
                          cm.textSize('xs'),
                          'text-on-surface-variant truncate block',
                        )}
                      >
                        {g.gift_date} · {g.campaign_name}
                      </span>
                    </span>
                    <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                      {formatMoney(g.amount_cents)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}
    </div>
  )
}
