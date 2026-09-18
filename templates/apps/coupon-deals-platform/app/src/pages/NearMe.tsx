import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import type { TranslateFunction } from '@molecule/app-i18n'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

interface NearbyDeal {
  id: string
  title: string
  merchant: string
  discount_pct: number
  deal_price_cents: number
  distance_km: number
  expires_at: string
  lat: number
  lng: number
  hot: boolean
}

function fmtUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function fmtDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`
  return `${km.toFixed(1)}km`
}

function expiresIn(iso: string, t: TranslateFunction): string {
  const ms = new Date(iso).getTime() - Date.now()
  if (ms < 0) return t('expiry.expired', {}, { defaultValue: 'Expired' })
  const h = Math.floor(ms / (1000 * 60 * 60))
  if (h < 24) return t('expiry.hoursLeft', { hours: h }, { defaultValue: '{{hours}}h left' })
  return t('expiry.daysLeft', { days: Math.floor(h / 24) }, { defaultValue: '{{days}}d left' })
}

export function NearMe() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [deals, setDeals] = useState<NearbyDeal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/nearby_deals')
      .then((res) => {
        if (!cancelled) setDeals(unwrapList<NearbyDeal>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('nearMe.loadError', {}, { defaultValue: 'Failed to load nearby deals.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-6')}>
      <header>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
          {t('nearMe.heading', {}, { defaultValue: 'Near me' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t('nearMe.subheading', {}, { defaultValue: 'Deals within 5km of your location.' })}
        </p>
      </header>

      <div className={cm.cn(cm.grid({ cols: 12, gap: 'md' }))}>
        <section className={cm.cn('col-span-12 lg:col-span-6', cm.card(), 'overflow-hidden')}>
          <div className={cm.cn('h-96 bg-surface-container relative')}>
            <div
              className={cm.cn(
                'absolute inset-0 grid place-items-center',
                'text-on-surface-variant',
                cm.textSize('sm'),
              )}
            >
              <div className="text-center">
                <span className="material-symbols-outlined text-5xl block" aria-hidden="true">
                  map
                </span>
                <p className={cm.sp('mt', 2)}>
                  {t(
                    'nearMe.mapPlaceholder',
                    {},
                    { defaultValue: 'Interactive map (Google/Mapbox via @molecule/app-maps)' },
                  )}
                </p>
              </div>
            </div>
            {!loading &&
              deals.slice(0, 5).map((d, i) => (
                <span
                  key={d.id}
                  className={cm.cn(
                    'absolute h-6 w-6 rounded-full bg-primary text-on-primary grid place-items-center text-xs font-bold',
                  )}
                  style={{ left: `${20 + i * 15}%`, top: `${30 + (i % 3) * 18}%` }}
                  title={d.title}
                >
                  {i + 1}
                </span>
              ))}
          </div>
        </section>

        <section className={cm.cn('col-span-12 lg:col-span-6')}>
          {error ? (
            <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
          ) : loading ? (
            <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
              {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
            </p>
          ) : deals.length === 0 ? (
            <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
              {t('nearMe.empty', {}, { defaultValue: 'No nearby deals.' })}
            </p>
          ) : (
            <ul className={cm.cn('space-y-3')}>
              {deals.map((d, i) => (
                <li
                  key={d.id}
                  className={cm.cn(
                    cm.card(),
                    cm.sp('p', 4),
                    cm.flex({ align: 'center', gap: 'md' }),
                  )}
                >
                  <span
                    className={cm.cn(
                      'h-8 w-8',
                      cm.roundedFull,
                      'bg-primary text-on-primary grid place-items-center',
                      cm.fontWeight('bold'),
                      cm.textSize('sm'),
                    )}
                  >
                    {i + 1}
                  </span>
                  <div className={cm.cn('min-w-0 flex-1')}>
                    <Link
                      to={`/deals/${d.id}`}
                      className={cm.cn(cm.fontWeight('semibold'), 'hover:underline truncate block')}
                    >
                      {d.title}
                    </Link>
                    <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {d.merchant} ·{' '}
                      {t(
                        'nearMe.distanceAway',
                        { distance: fmtDistance(d.distance_km) },
                        { defaultValue: '{{distance}} away' },
                      )}
                    </p>
                  </div>
                  <div className={cm.cn('text-right shrink-0')}>
                    <p
                      className={cm.cn(
                        cm.textSize('lg'),
                        cm.fontWeight('bold'),
                        cm.textPrimary,
                        'tabular-nums',
                      )}
                    >
                      {fmtUsd(d.deal_price_cents)}
                    </p>
                    <p className={cm.cn(cm.textSize('xs'), 'text-warning')}>
                      {expiresIn(d.expires_at, t)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
