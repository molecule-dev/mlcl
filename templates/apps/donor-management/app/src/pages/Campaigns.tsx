import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { formatMoney } from '../lib/format.js'
import { unwrapList } from '../lib/unwrap.js'
import type { Campaign } from '../types.js'

export function Campaigns() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [list, setList] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/campaigns')
      .then((res) => {
        if (!cancelled) setList(unwrapList<Campaign>(res))
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
                  className={cm.cn(cm.textSize('sm'), 'text-primary hover:underline')}
                >
                  {t('campaigns.viewGifts', {}, { defaultValue: 'View gifts →' })}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
