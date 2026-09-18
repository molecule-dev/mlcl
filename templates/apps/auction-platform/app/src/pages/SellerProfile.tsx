import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AuctionCard } from '../components/AuctionCard.js'

interface SellerProfileData {
  handle: string
  name: string
  bio: string
  avatar_url?: string | null
  verified: boolean
  rating: number
  positive_pct: number
  review_count?: number
  total_sales: number
  member_since: string
  badges: string[]
  active_listings: Array<{
    id: string
    title: string
    category: string
    lot?: string
    current_bid_cents: number
    bid_count: number
    ends_at: string
    status?: 'live' | 'ending' | 'closed' | 'reserve_not_met'
  }>
  reviews: Array<{ id: string; bidder: string; stars: number; body: string; when: string }>
}

type Tab = 'active' | 'sold' | 'reviews' | 'about'

const TABS: readonly Tab[] = ['active', 'sold', 'reviews', 'about']

function parseTab(hash: string): Tab {
  const v = hash.replace(/^#/, '')
  return (TABS as readonly string[]).includes(v) ? (v as Tab) : 'active'
}

function fmtCount(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 })
}

export function SellerProfile() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { handle } = useParams<{ handle: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const tab = parseTab(location.hash)
  const setTab = (next: Tab) => {
    navigate({ pathname: location.pathname, hash: `#${next}` })
  }
  const [data, setData] = useState<SellerProfileData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setData(null)
    setLoading(true)
    setError(null)
    http
      .get<SellerProfileData>(`/api/sellers/${handle ?? ''}`)
      .then((res) => {
        if (cancelled) return
        const body = res.data as SellerProfileData | undefined
        if (!body || !body.handle) {
          setData(null)
        } else {
          setData(body)
        }
      })
      .catch((e: unknown) => {
        if (cancelled) return
        // 404s become a friendly "not found" copy so the page reads like
        // missing-resource rather than a network failure.
        const msg = e instanceof Error ? e.message : ''
        if (/404|not\s*found/i.test(msg)) {
          setError(
            t('sellerProfile.notFound', {}, { defaultValue: 'We could not find that seller.' }),
          )
        } else {
          setError(msg || t('sellerProfile.error', {}, { defaultValue: 'Could not load seller.' }))
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, handle, t])

  if (loading) {
    return (
      <div id="top">
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, cm.textMuted)}>
          {t('sellerProfile.loading', {}, { defaultValue: 'Loading seller profile…' })}
        </p>
      </div>
    )
  }
  if (error || !data) {
    return (
      <div
        id="top"
        className={cm.cn(cm.sp('px', 8), cm.sp('py', 16), cm.maxW('5xl'), cm.mxAuto, cm.stack(4))}
      >
        <p className={cm.cn(cm.textCenter, 'text-error')}>
          {error ??
            t(
              'sellerProfile.unavailable',
              {},
              { defaultValue: 'This seller profile is unavailable.' },
            )}
        </p>
        <Link
          to="/auctions"
          className={cm.cn(cm.textCenter, 'text-sm font-semibold text-primary hover:underline')}
        >
          {t('sellerProfile.backToAuctions', {}, { defaultValue: 'Back to all auctions →' })}
        </Link>
      </div>
    )
  }

  return (
    <div
      id="top"
      className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(8))}
    >
      {/* Hero header */}
      <header
        className={cm.cn(
          cm.sp('p', 8),
          'relative overflow-hidden rounded-3xl text-white shadow-2xl',
        )}
        style={{
          background:
            'linear-gradient(135deg, var(--color-timer), #312419 60%, var(--mol-color-primary-dark))',
        }}
      >
        <div
          className={cm.cn(
            'absolute -right-20 -bottom-20 w-72 h-72 rounded-full bg-surface/10 blur-3xl',
          )}
          aria-hidden="true"
        />
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'lg', wrap: 'wrap' }))}>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              'w-24 h-24 rounded-full text-3xl font-extrabold',
            )}
            style={{
              background:
                'linear-gradient(135deg, var(--mol-color-primary), var(--color-primary-gradient-end))',
            }}
          >
            {data.name.charAt(0)}
          </div>
          <div className={cm.cn(cm.stack(2), 'flex-1 min-w-0')}>
            <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
              <h1 className={cm.cn('text-3xl font-extrabold tracking-tight')}>{data.name}</h1>
              {data.verified ? (
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    'px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest text-white',
                  )}
                  style={{ background: 'var(--color-accent)' }}
                >
                  <span className={cm.cn('material-symbols-outlined text-sm')} aria-hidden="true">
                    verified
                  </span>
                  {t('sellerProfile.verified', {}, { defaultValue: 'Verified' })}
                </span>
              ) : null}
            </div>
            <p className={cm.cn('text-sm text-white/70')}>
              @{data.handle}
              {data.member_since
                ? ` · ${t('sellerProfile.memberSince', { year: data.member_since.slice(0, 4) }, { defaultValue: 'Member since {{year}}' })}`
                : ''}
            </p>
            <div className={cm.flex({ align: 'center', gap: 'lg', wrap: 'wrap' })}>
              {data.reviews.length > 0 ? (
                <>
                  <div>
                    <p className={cm.cn('text-2xl font-extrabold tabular-nums')}>
                      ★ {data.rating.toFixed(2)}
                    </p>
                    <p className={cm.cn('text-xs uppercase tracking-widest opacity-70')}>
                      {t('sellerProfile.statRating', {}, { defaultValue: 'Buyer rating' })}
                    </p>
                  </div>
                  <div>
                    <p className={cm.cn('text-2xl font-extrabold tabular-nums')}>
                      {data.positive_pct}%
                    </p>
                    <p className={cm.cn('text-xs uppercase tracking-widest opacity-70')}>
                      {t('sellerProfile.statPositive', {}, { defaultValue: 'Positive feedback' })}
                    </p>
                  </div>
                </>
              ) : (
                <div>
                  <p className={cm.cn('text-sm font-bold opacity-90')}>
                    {t(
                      'sellerProfile.noRatingYet',
                      {},
                      { defaultValue: 'New seller — no buyer reviews yet.' },
                    )}
                  </p>
                </div>
              )}
              <div>
                <p className={cm.cn('text-2xl font-extrabold tabular-nums')}>{data.total_sales}</p>
                <p className={cm.cn('text-xs uppercase tracking-widest opacity-70')}>
                  {t('sellerProfile.statSales', {}, { defaultValue: 'Items sold' })}
                </p>
              </div>
            </div>
          </div>
          {data.badges.length > 0 ? (
            <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
              {data.badges.map((b) => (
                <span
                  key={b}
                  className={cm.cn(
                    'px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-surface/15 backdrop-blur-md',
                  )}
                >
                  {b}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </header>

      <nav
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'sm' }),
          'border-b border-outline-variant/40',
        )}
        aria-label={t('sellerProfile.tabsLabel', {}, { defaultValue: 'Profile sections' })}
      >
        {(['active', 'sold', 'reviews', 'about'] as const).map((k) => {
          const active = k === tab
          const label = t(
            `sellerProfile.tab.${k}`,
            {},
            { defaultValue: k.charAt(0).toUpperCase() + k.slice(1) },
          )
          if (active) {
            return (
              <span
                key={k}
                aria-current="true"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'text-sm font-bold tracking-tight border-b-2 text-primary',
                )}
                style={{ borderBottomColor: 'var(--mol-color-primary)' }}
              >
                {label}
              </span>
            )
          }
          return (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                'text-sm font-bold tracking-tight border-b-2 transition-colors',
                'text-on-surface-variant border-transparent hover:text-on-surface',
              )}
            >
              {label}
            </button>
          )
        })}
      </nav>

      {tab === 'active' ? (
        data.active_listings.length === 0 ? (
          <p className={cm.cn(cm.sp('py', 12), cm.textCenter, cm.textMuted)}>
            {t(
              'sellerProfile.noActive',
              {},
              { defaultValue: 'This seller has no active listings.' },
            )}
          </p>
        ) : (
          <section
            className={cm.cn(
              cm.grid({ gap: 'md' }),
              'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
            )}
          >
            {data.active_listings.map((l) => (
              <AuctionCard
                key={l.id}
                id={l.id}
                title={l.title}
                lot={l.lot ?? ''}
                category={l.category}
                imageAlt={l.title}
                currentBidCents={l.current_bid_cents}
                bidCount={l.bid_count}
                endsAtIso={l.ends_at}
                status={l.status ?? 'live'}
              />
            ))}
          </section>
        )
      ) : null}

      {tab === 'sold' ? (
        <section className={cm.cn(cm.sp('py', 12), cm.textCenter, cm.stack(2))}>
          <span
            className={cm.cn('material-symbols-outlined text-5xl text-on-surface-variant mx-auto')}
            aria-hidden="true"
          >
            history
          </span>
          <p className={cm.cn('font-bold')}>
            {t(
              'sellerProfile.soldEmpty',
              {},
              { defaultValue: 'Sold history is private to the seller.' },
            )}
          </p>
          <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
            {t(
              'sellerProfile.soldHint',
              {},
              { defaultValue: 'Check the reviews tab for buyer feedback on past sales.' },
            )}
          </p>
        </section>
      ) : null}

      {tab === 'reviews' ? (
        data.reviews.length === 0 ? (
          <p className={cm.cn(cm.sp('py', 12), cm.textCenter, cm.textMuted)}>
            {t('sellerProfile.reviewsEmpty', {}, { defaultValue: 'No reviews yet.' })}
          </p>
        ) : (
          <section className={cm.cn('space-y-3')}>
            {data.reviews.map((r) => (
              <article
                key={r.id}
                className={cm.cn(
                  cm.sp('p', 5),
                  'rounded-xl bg-surface border border-outline-variant/40 stack-y space-y-2',
                )}
              >
                <header className={cm.flex({ align: 'center', justify: 'between' })}>
                  <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                    <div
                      className={cm.cn(
                        'w-8 h-8 rounded-full text-white text-xs font-bold flex items-center justify-center',
                      )}
                      style={{ background: 'var(--color-accent)' }}
                    >
                      {r.bidder.charAt(0).toUpperCase()}
                    </div>
                    <span className={cm.cn('font-bold')}>{r.bidder}</span>
                  </div>
                  <span
                    className={cm.cn('font-bold tabular-nums')}
                    style={{ color: 'var(--color-ending-soon)' }}
                  >
                    ★ {r.stars.toFixed(1)}
                  </span>
                </header>
                <p className={cm.cn('text-sm text-on-surface-variant leading-relaxed')}>{r.body}</p>
                <p className={cm.cn(cm.textSize('xs'), cm.textMuted)}>
                  {new Date(r.when).toLocaleDateString()}
                </p>
              </article>
            ))}
          </section>
        )
      ) : null}

      {tab === 'about' ? (
        <section
          className={cm.cn(
            cm.sp('p', 6),
            'rounded-xl bg-surface border border-outline-variant/40 stack-y space-y-3',
          )}
        >
          <h2 className={cm.cn('text-lg font-extrabold tracking-tight')}>
            {t('sellerProfile.aboutHeading', {}, { defaultValue: 'About this seller' })}
          </h2>
          <p className={cm.cn('text-sm text-on-surface-variant leading-relaxed')}>
            {data.bio ||
              t(
                'sellerProfile.aboutEmpty',
                {},
                { defaultValue: 'This seller has not added a bio yet.' },
              )}
          </p>
          <dl
            className={cm.cn(
              'grid grid-cols-2 gap-3 text-sm pt-2 border-t border-outline-variant/40',
            )}
          >
            <div>
              <dt
                className={cm.cn(
                  'text-xs font-bold uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('sellerProfile.aboutSales', {}, { defaultValue: 'Sales completed' })}
              </dt>
              <dd className={cm.cn('font-extrabold tabular-nums text-lg')}>
                {fmtCount(data.total_sales)}
              </dd>
            </div>
            <div>
              <dt
                className={cm.cn(
                  'text-xs font-bold uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('sellerProfile.aboutMember', {}, { defaultValue: 'Member since' })}
              </dt>
              <dd className={cm.cn('font-extrabold text-lg')}>
                {data.member_since ? new Date(data.member_since).toLocaleDateString() : '—'}
              </dd>
            </div>
          </dl>
        </section>
      ) : null}
    </div>
  )
}

export default SellerProfile
