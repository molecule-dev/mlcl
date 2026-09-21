import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import type { TranslateFunction } from '@molecule/app-i18n'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface Merchant {
  id: string
  name: string
  category: string
  rating: number
  bio: string
  hours: { day: string; open: string; close: string }[]
  address: string
  phone: string
  initial: string
}

interface Deal {
  id: string
  title: string
  discount_pct: number
  deal_price_cents: number
  original_price_cents: number
  expires_at: string
}

function fmtUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function expiresIn(iso: string, t: TranslateFunction): string {
  const ms = new Date(iso).getTime() - Date.now()
  if (ms < 0) return t('expiry.expired', {}, { defaultValue: 'Expired' })
  const h = Math.floor(ms / (1000 * 60 * 60))
  if (h < 24) return t('expiry.hoursLeft', { hours: h }, { defaultValue: '{{hours}}h left' })
  return t('expiry.daysLeft', { days: Math.floor(h / 24) }, { defaultValue: '{{days}}d left' })
}

export function MerchantDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()
  const [merchant, setMerchant] = useState<Merchant | null>(null)
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    Promise.all([
      http.get(`/merchants/${id}`).catch(() => null),
      http.get(`/deals?merchant_id=${id}`).catch(() => null),
    ])
      .then(([mRes, dRes]) => {
        if (cancelled) return
        setMerchant(unwrapSingle<Merchant>(mRes))
        setDeals(unwrapList<Deal>(dRes))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('merchantDetail.loadError', {}, { defaultValue: 'Failed to load merchant.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id, t])

  if (loading)
    return (
      <div className={cm.cn(cm.sp('p', 8), 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </div>
    )
  if (error || !merchant)
    return (
      <div
        className={cm.cn(cm.sp('p', 8), cm.flex({ direction: 'col', align: 'center', gap: 'md' }))}
      >
        <p role="alert" className={cm.cn('text-error')}>
          {error ??
            t(
              'merchantDetail.unavailable',
              {},
              { defaultValue: 'This merchant is no longer available.' },
            )}
        </p>
        <Link
          to="/merchants"
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            'rounded-full border border-outline-variant text-on-surface hover:bg-surface-container transition-colors',
          )}
        >
          {t('merchantDetail.browseAll', {}, { defaultValue: 'Browse all merchants' })}
        </Link>
      </div>
    )

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-6')}>
      <Link
        to="/merchants"
        className={cm.cn(
          cm.textSize('sm'),
          cm.textPrimary,
          'hover:underline inline-block py-1 w-fit',
        )}
      >
        ← {t('merchantDetail.back', {}, { defaultValue: 'All merchants' })}
      </Link>

      <header
        className={cm.cn(
          cm.card(),
          cm.sp('p', 6),
          cm.flex({ align: 'center', gap: 'lg' }),
          'flex-col text-center sm:flex-row sm:text-left',
        )}
      >
        <span
          className={cm.cn(
            'h-20 w-20',
            cm.roundedFull,
            'bg-primary-container grid place-items-center shrink-0',
            cm.fontWeight('bold'),
            cm.textPrimary,
            cm.textSize('3xl'),
          )}
        >
          {merchant.initial}
        </span>
        <div className={cm.cn('min-w-0')}>
          <h1 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))}>{merchant.name}</h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {merchant.category} · ★ {merchant.rating.toFixed(1)}
          </p>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2))}>{merchant.bio}</p>
        </div>
      </header>

      <div className={cm.cn(cm.grid({ cols: 12, gap: 'md' }))}>
        <section className={cm.cn('col-span-12 lg:col-span-8 space-y-4')}>
          <h2 className={cm.cn(cm.sectionHeading, cm.sp('mb', 3))}>
            {t('merchantDetail.dealsHeading', {}, { defaultValue: 'Active deals' })}
          </h2>
          {deals.length === 0 ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'merchantDetail.noDeals',
                {},
                { defaultValue: 'No active deals from this merchant.' },
              )}
            </p>
          ) : (
            <ul className={cm.cn('space-y-3')}>
              {deals.map((d) => (
                <li key={d.id} className={cm.cn(cm.card(), cm.sp('p', 4))}>
                  <Link
                    to={`/deals/${d.id}`}
                    className={cm.flex({ align: 'center', justify: 'between' })}
                  >
                    <div className={cm.cn('min-w-0 flex-1')}>
                      <p className={cm.cn(cm.fontWeight('semibold'), 'hover:underline')}>
                        {d.title}
                      </p>
                      <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                        {expiresIn(d.expires_at, t)}
                      </p>
                    </div>
                    <div className={cm.cn('text-right shrink-0')}>
                      <span
                        className={cm.cn(
                          cm.sp('px', 2),
                          cm.textSize('xs'),
                          cm.fontWeight('bold'),
                          cm.roundedFull,
                          'bg-success/15 text-success',
                        )}
                      >
                        {t(
                          'merchantDetail.discountBadge',
                          { pct: d.discount_pct },
                          { defaultValue: '{{pct}}% OFF' },
                        )}
                      </span>
                      <p
                        className={cm.cn(
                          cm.textSize('lg'),
                          cm.fontWeight('bold'),
                          cm.sp('mt', 1),
                          cm.textPrimary,
                          'tabular-nums',
                        )}
                      >
                        {fmtUsd(d.deal_price_cents)}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className={cm.cn('col-span-12 lg:col-span-4 space-y-4')}>
          <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-2')}>
            <h2 className={cm.sectionHeading}>
              {t('nav.contact', {}, { defaultValue: 'Contact' })}
            </h2>
            <p className={cm.cn(cm.textSize('sm'))}>{merchant.address}</p>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>{merchant.phone}</p>
          </section>

          <section className={cm.cn(cm.card(), cm.sp('p', 5))}>
            <h2 className={cm.cn(cm.sectionHeading, cm.sp('mb', 3))}>
              {t('merchantDetail.hoursHeading', {}, { defaultValue: 'Hours' })}
            </h2>
            <ul className={cm.cn('space-y-1 text-sm')}>
              {merchant.hours.map((h) => (
                <li key={h.day} className={cm.flex({ align: 'center', justify: 'between' })}>
                  <span>{h.day}</span>
                  <span className={cm.cn('tabular-nums', 'text-on-surface-variant')}>
                    {h.open} – {h.close}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  )
}
