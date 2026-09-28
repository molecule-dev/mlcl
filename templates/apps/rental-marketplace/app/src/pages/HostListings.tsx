import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

interface HostListing {
  id: string
  title: string
  city: string
  country: string
  thumbnail_url?: string | null
  status: string
  rating: number
  review_count: number
  price_per_night_cents: number
  total_bookings: number
  instant_book: boolean
  max_guests: number
}

const STATUS_THEME: Record<string, { className: string; label: string; icon: string }> = {
  active: { className: 'bg-success-light text-success', label: 'Live', icon: 'check_circle' },
  paused: { className: 'bg-warning-light text-warning', label: 'Paused', icon: 'pause_circle' },
  archived: {
    className: 'bg-surface-secondary text-foreground-secondary',
    label: 'Archived',
    icon: 'archive',
  },
  draft: {
    className: 'bg-surface-secondary text-foreground-secondary',
    label: 'Draft',
    icon: 'draft',
  },
}

const FALLBACK_STATUS_THEME = STATUS_THEME.active

function fmtPrice(cents: number) {
  return `$${Math.round(cents / 100).toLocaleString()}`
}

export function HostListings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [listings, setListings] = useState<HostListing[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/host-listings')
      .then((res) => {
        if (!cancelled) setListings(unwrapList<HostListing>(res.data))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  return (
    <div className={cm.cn(cm.maxW('6xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      <header
        className={cm.cn(
          cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 'md' }),
          cm.sp('mb', 6),
        )}
      >
        <div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-[0.25em] text-primary-dark',
            )}
          >
            {t('hostListings.eyebrow', {}, { defaultValue: 'Your portfolio' })}
          </p>
          <h1
            className={cm.cn(
              cm.textSize('4xl'),
              cm.fontWeight('extrabold'),
              cm.sp('mt', 2),
              'leading-tight tracking-tight',
            )}
            style={{ fontFamily: '"DM Sans", -apple-system, sans-serif' }}
          >
            {t('hostListings.heading', {}, { defaultValue: 'Listings' })}
          </h1>
        </div>
        <Link
          to="/host/listings/new"
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 2),
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            'rounded-full bg-primary text-on-primary hover:bg-primary-container shadow-sm',
          )}
        >
          <span className={'material-symbols-outlined text-base'} aria-hidden="true">
            add
          </span>
          {t('hostListings.create', {}, { defaultValue: 'Create new listing' })}
        </Link>
      </header>

      {loading ? (
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={cm.cn('h-32 rounded-2xl bg-surface-container animate-pulse')} />
          ))}
        </div>
      ) : (
        <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
          {listings.map((l) => {
            const theme = STATUS_THEME[l.status] ?? FALLBACK_STATUS_THEME
            return (
              <li key={l.id}>
                <Link
                  to={`/host/listings/${l.id}`}
                  className={cm.cn(
                    cm.sp('p', 4),
                    cm.flex({ align: 'center', gap: 'md' }),
                    'group block bg-surface rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all',
                    cm.accentCard({ tone: 'primary' }),
                  )}
                >
                  <div
                    className={cm.cn(
                      'w-32 aspect-[4/3] flex-shrink-0 bg-surface-variant rounded-xl overflow-hidden',
                    )}
                  >
                    {l.thumbnail_url ? (
                      <img
                        src={l.thumbnail_url}
                        alt=""
                        className={cm.cn(cm.w('full'), cm.h('full'), 'object-cover')}
                      />
                    ) : null}
                  </div>
                  <div className={'flex-1 min-w-0 space-y-1'}>
                    <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
                      <h3
                        className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}
                        style={{ fontFamily: '"DM Sans", -apple-system, sans-serif' }}
                      >
                        {l.title}
                      </h3>
                      <span
                        className={cm.cn(
                          cm.sp('px', 3),
                          cm.sp('py', 1),
                          cm.textSize('xs'),
                          cm.fontWeight('bold'),
                          cm.flex({ align: 'center', gap: 'xs' }),
                          'uppercase tracking-widest rounded-full',
                          theme.className,
                        )}
                      >
                        <span className={'material-symbols-outlined text-sm'} aria-hidden="true">
                          {theme.icon}
                        </span>
                        {t(`hostListings.status.${l.status}`, {}, { defaultValue: theme.label })}
                      </span>
                    </div>
                    <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                      {l.city}, {l.country} · {l.max_guests} guests ·{' '}
                      {fmtPrice(l.price_per_night_cents)}/night
                    </p>
                    <p
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }),
                        'text-on-surface-variant tabular-nums',
                      )}
                    >
                      {l.review_count > 0 ? (
                        <span className={cm.flex({ align: 'center', gap: 'xs' })}>
                          <span
                            className={'material-symbols-outlined text-sm text-warning'}
                            aria-hidden="true"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                          >
                            star
                          </span>
                          {l.rating.toFixed(2)} · {l.review_count} reviews
                        </span>
                      ) : (
                        <span>
                          {t('hostListings.noReviews', {}, { defaultValue: 'No reviews yet' })}
                        </span>
                      )}
                      <span aria-hidden="true">·</span>
                      <span>
                        {l.total_bookings}{' '}
                        {t('hostListings.tripsLabel', {}, { defaultValue: 'trips' })}
                      </span>
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.fontWeight('bold'),
                        'uppercase tracking-widest text-on-surface-variant',
                      )}
                    >
                      {t('hostListings.nightlyRate', {}, { defaultValue: 'Nightly' })}
                    </p>
                    <p
                      className={cm.cn(
                        cm.textSize('xl'),
                        cm.fontWeight('extrabold'),
                        'tabular-nums',
                      )}
                    >
                      {fmtPrice(l.price_per_night_cents)}
                    </p>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
