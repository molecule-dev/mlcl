import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { BrandWordmark } from '../components/BrandWordmark.js'
import { HeroAuctionCard } from '../components/HeroAuctionCard.js'

interface LivePreview {
  id: string
  category: string
  title: string
  current_bid_cents: number
  bid_count: number
  ends_at: string
}

/** Explore-categories tiles (the Stitch landing's category grid). Counts are
 *  filled from the same live-auctions fetch as the Live-now strip, so the
 *  numbers are the real live floor, never marketing copy. */
const EXPLORE_CATEGORIES = [
  { key: 'art', defaultLabel: 'Fine Art', icon: 'palette', featured: true },
  { key: 'watches', defaultLabel: 'Timepieces', icon: 'watch', featured: false },
  { key: 'cars', defaultLabel: 'Classic Cars', icon: 'directions_car', featured: false },
  { key: 'jewelry', defaultLabel: 'Jewelry', icon: 'diamond', featured: false },
  { key: 'collectibles', defaultLabel: 'Collectibles', icon: 'category', featured: false },
] as const

/* Dark-to-dark token gradients only — white tile labels stay ≥4.5:1 on every
   stop (verified against theme.css: timer #1e1e1e, primary-dark #9a3412,
   accent-dark #147a56 all clear 4.5:1 under white). */
const CATEGORY_TILE_BG: Record<string, string> = {
  art: 'linear-gradient(150deg, var(--color-timer) 20%, var(--mol-color-primary-dark))',
  watches: 'linear-gradient(150deg, var(--mol-color-primary-dark), var(--color-timer))',
  cars: 'linear-gradient(150deg, var(--color-timer) 20%, var(--color-accent-dark))',
  jewelry: 'linear-gradient(150deg, var(--color-accent-dark), var(--color-timer))',
  collectibles: 'linear-gradient(150deg, var(--color-timer) 35%, var(--mol-color-primary-dark))',
}

const FEATURES = [
  {
    key: 'live',
    defaultTitle: 'Live, real-time bidding',
    defaultBody:
      'Watch the gavel fall second-by-second. Place bids that update for every collector at the same time.',
    icon: 'gavel',
    tint: 'text-primary',
  },
  {
    key: 'curated',
    defaultTitle: 'Curated, verified lots',
    defaultBody:
      'Every collectible, painting, and timepiece is appraised by experts before it ever reaches the floor.',
    icon: 'verified',
    tint: 'text-secondary',
  },
  {
    key: 'safe',
    defaultTitle: 'Buyer protection built-in',
    defaultBody:
      'Authenticated payments, escrowed funds, and damage-free shipping insurance on every won auction.',
    icon: 'shield_lock',
    tint: 'text-info',
  },
  {
    key: 'sellers',
    defaultTitle: 'Premium audience',
    defaultBody:
      'List in minutes and put your piece in front of 240,000 verified bidders worldwide.',
    icon: 'storefront',
    tint: 'text-info',
  },
] as const

function fmt(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

/** Decorative demo lot shown in the hero when the API has no live lots yet
 *  (matches the Stitch design's featured-auction tile; never real data). */
const DEMO_HERO_LOT = {
  id: 'demo',
  title: '1969 Omega Speedmaster Pro',
  category: 'Vintage Watches',
  lot: 'Lot #492 · Vintage Watches',
  current_bid_cents: 245000,
  bid_count: 42,
}

function demoEndsAtIso(): string {
  return new Date(Date.now() + 83 * 60 * 1000 + 45 * 1000).toISOString()
}

function fmtCountdown(iso: string): string {
  const ms = Math.max(0, new Date(iso).getTime() - Date.now())
  const totalSeconds = Math.floor(ms / 1000)
  const hh = String(Math.floor(totalSeconds / 3600)).padStart(2, '0')
  const mm = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0')
  const ss = String(totalSeconds % 60).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const isAuthenticated = useIsAuthenticated()
  const [previews, setPreviews] = useState<LivePreview[] | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    let cancelled = false
    http
      .get<{ data?: LivePreview[] }>('/api/auctions?limit=100')
      .then((res) => {
        if (cancelled) return
        const list = (res.data?.data ?? []) as LivePreview[]
        setPreviews(list.slice(0, 4))
        const counts: Record<string, number> = {}
        for (const it of list) counts[it.category] = (counts[it.category] ?? 0) + 1
        setCategoryCounts(counts)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setPreviewError(
          e instanceof Error
            ? e.message
            : t('landing.liveNowError', {}, { defaultValue: 'Could not load live auctions.' }),
        )
        setPreviews([])
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const hero = previews?.[0]

  return (
    <div id="top" className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      <nav
        className={cm.cn(
          'sticky top-0 z-50 bg-surface/80 backdrop-blur-md border-b border-outline-variant/40',
        )}
      >
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.sp('px', 6),
            cm.sp('py', 4),
            cm.flex({ align: 'center', justify: 'between' }),
            cm.mxAuto,
          )}
        >
          <Link to="/#top" className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
            <BrandWordmark as="span" size="md" />
          </Link>
          <div className={cm.flex({ align: 'center', gap: 'md' })}>
            {isAuthenticated ? (
              <Link
                to="/auctions"
                data-mol-id="landing-nav-dashboard"
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.fontWeight('semibold'),
                  'rounded-lg text-white transition-colors hover:opacity-90',
                )}
                style={{ background: 'var(--mol-color-primary)' }}
              >
                {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    'text-on-surface-variant hover:text-on-surface',
                  )}
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </Link>
                <Link
                  to="/signup"
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 2),
                    cm.fontWeight('semibold'),
                    'rounded-lg text-white transition-colors hover:opacity-90',
                  )}
                  style={{ background: 'var(--mol-color-primary)' }}
                >
                  {t('landing.signUp', {}, { defaultValue: 'Start bidding' })}
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main>
        {/* Hero */}
        <section
          className={cm.cn('relative overflow-hidden')}
          style={{ background: 'var(--color-surface-secondary)' }}
        >
          {/* Abstract background shape — the design's single soft orange glow */}
          <div
            className={cm.cn(
              'absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full blur-3xl opacity-50 z-0',
            )}
            style={{ background: 'var(--mol-color-primary-light)' }}
            aria-hidden="true"
          />

          <div
            className={cm.cn(
              cm.maxW('7xl'),
              cm.mxAuto,
              cm.sp('px', 6),
              'py-20 md:py-28 lg:py-32 relative',
            )}
          >
            <div className={cm.cn('grid grid-cols-1 lg:grid-cols-12 gap-12 items-center')}>
              <div className={cm.cn('lg:col-span-7')}>
                <div
                  className={cm.cn(
                    'inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-6',
                  )}
                  style={{
                    background: 'var(--color-bid-outbid-light)',
                    color: 'var(--color-error)',
                  }}
                >
                  <span
                    className={cm.cn('w-2 h-2 rounded-full animate-pulse')}
                    style={{ background: 'var(--color-bid-outbid)' }}
                    aria-hidden="true"
                  />
                  {t(
                    'landing.eyebrow',
                    { count: previews?.length ?? 0 },
                    { defaultValue: 'Live now' },
                  )}
                </div>
                <h1
                  className={cm.cn(
                    cm.sp('mb', 6),
                    'text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[0.95]',
                  )}
                >
                  {t(
                    'landing.heroTitle',
                    { tagline: APP_TAGLINE },
                    { defaultValue: 'Every second' },
                  )}
                  <span className={cm.cn('block')} style={{ color: 'var(--mol-color-primary)' }}>
                    {t('landing.heroTitleAccent', {}, { defaultValue: 'counts.' })}
                  </span>
                </h1>
                <p
                  className={cm.cn(
                    cm.textSize('lg'),
                    cm.sp('mb', 10),
                    'text-on-surface-variant max-w-xl leading-relaxed',
                  )}
                >
                  {t(
                    'landing.heroSubtitle',
                    {},
                    {
                      defaultValue:
                        'Live auctions for collectors who know what they want. Bid in real-time on rare watches, fine art, and one-of-a-kind specialty items.',
                    },
                  )}
                </p>
                <div className={cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' })}>
                  <Link
                    to="/signup"
                    className={cm.cn(
                      cm.sp('px', 8),
                      cm.sp('py', 4),
                      'font-bold rounded-lg text-white inline-flex items-center gap-2 shadow-lg shadow-primary/30 hover:-translate-y-0.5 transition-all hover:opacity-90',
                    )}
                    style={{ background: 'var(--mol-color-primary)' }}
                  >
                    {t('landing.heroCta', {}, { defaultValue: 'Start bidding' })}
                    <span
                      className={cm.cn('material-symbols-outlined text-base')}
                      aria-hidden="true"
                    >
                      arrow_forward
                    </span>
                  </Link>
                  <Link
                    to="/auctions"
                    className={cm.cn(
                      cm.sp('px', 8),
                      cm.sp('py', 4),
                      cm.fontWeight('bold'),
                      'rounded-lg border border-outline-variant bg-surface text-on-surface hover:bg-surface-container-low transition-colors inline-flex items-center gap-2',
                    )}
                  >
                    <span
                      className={cm.cn('material-symbols-outlined text-base')}
                      aria-hidden="true"
                    >
                      explore
                    </span>
                    {t('landing.browseCta', {}, { defaultValue: 'Browse auctions' })}
                  </Link>
                </div>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'lg' }),
                    cm.sp('mt', 10),
                    cm.sp('pt', 6),
                    'border-t border-outline-variant/40',
                  )}
                >
                  <div>
                    <p className={cm.cn('text-2xl font-extrabold tabular-nums tracking-tight')}>
                      240K+
                    </p>
                    <p className={cm.cn(cm.textSize('xs'), cm.textMuted)}>
                      {t('landing.statBidders', {}, { defaultValue: 'Active bidders' })}
                    </p>
                  </div>
                  <div className={cm.cn('w-px h-10 bg-outline-variant')} />
                  <div>
                    <p className={cm.cn('text-2xl font-extrabold tabular-nums tracking-tight')}>
                      $180M
                    </p>
                    <p className={cm.cn(cm.textSize('xs'), cm.textMuted)}>
                      {t('landing.statSold', {}, { defaultValue: 'Transacted in 2026' })}
                    </p>
                  </div>
                  <div className={cm.cn('w-px h-10 bg-outline-variant')} />
                  <div>
                    <p className={cm.cn('text-2xl font-extrabold tabular-nums tracking-tight')}>
                      98%
                    </p>
                    <p className={cm.cn(cm.textSize('xs'), cm.textMuted)}>
                      {t('landing.statSatisfaction', {}, { defaultValue: 'Buyer satisfaction' })}
                    </p>
                  </div>
                </div>
              </div>

              <div className={cm.cn('lg:col-span-5 relative z-10 flex justify-end')}>
                {hero ? (
                  <HeroAuctionCard
                    id={hero.id}
                    category={hero.category}
                    title={hero.title}
                    lot={`Lot · ${hero.category}`}
                    imageAlt={hero.title}
                    bidCount={hero.bid_count}
                    currentBidCents={hero.current_bid_cents}
                    endsAtIso={hero.ends_at}
                  />
                ) : (
                  /* Demo lot tile — keeps the hero visual when the API has no
                     live lots yet (dev/preview); same design card, demo data. */
                  <HeroAuctionCard
                    id={DEMO_HERO_LOT.id}
                    category={DEMO_HERO_LOT.category}
                    title={DEMO_HERO_LOT.title}
                    lot={DEMO_HERO_LOT.lot}
                    imageAlt={DEMO_HERO_LOT.title}
                    bidCount={DEMO_HERO_LOT.bid_count}
                    currentBidCents={DEMO_HERO_LOT.current_bid_cents}
                    endsAtIso={demoEndsAtIso()}
                    ribbonLabel={t('landing.demoRibbon', {}, { defaultValue: 'Featured lot' })}
                  />
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Live now strip */}
        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-16')}>
          <div className={cm.cn(cm.flex({ align: 'end', justify: 'between' }), cm.sp('mb', 6))}>
            <div>
              <h2
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  'text-3xl font-extrabold tracking-tight',
                )}
              >
                <span
                  className={cm.cn('w-3 h-3 rounded-full animate-pulse')}
                  style={{ background: 'var(--color-urgent)' }}
                  aria-hidden="true"
                />
                {t('landing.liveNowHeading', {}, { defaultValue: 'Live now' })}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), cm.textMuted)}>
                {t(
                  'landing.liveNowSubheading',
                  {},
                  { defaultValue: 'Auctions closing in the next four hours.' },
                )}
              </p>
            </div>
            <Link
              to="/auctions"
              className={cm.cn(cm.textSize('sm'), 'font-bold text-primary hover:underline')}
            >
              {t('landing.viewAllLive', {}, { defaultValue: 'View all live →' })}
            </Link>
          </div>

          {previews === null ? (
            <p className={cm.cn(cm.sp('py', 8), cm.textCenter, cm.textMuted)}>
              {t('landing.liveNowLoading', {}, { defaultValue: 'Loading live auctions…' })}
            </p>
          ) : previewError || previews.length === 0 ? (
            /* Design-shaped empty state — the section keeps its card rhythm
               even when the floor is quiet. */
            <div
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'md' }),
                'rounded-lg border border-outline-variant/40 bg-surface p-6 text-on-surface-variant',
              )}
            >
              <span
                className={cm.cn('material-symbols-outlined text-2xl text-primary')}
                aria-hidden="true"
              >
                gavel
              </span>
              <p className={cm.cn(cm.textSize('sm'))}>
                {previewError ??
                  t(
                    'landing.liveNowEmpty',
                    {},
                    { defaultValue: 'No live auctions right now — be the first to list.' },
                  )}
              </p>
            </div>
          ) : (
            <div
              className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4')}
            >
              {previews.map((p) => (
                <Link
                  key={p.id}
                  to={`/auctions/${p.id}`}
                  className={cm.cn(
                    'group relative bg-surface rounded-xl border border-outline-variant/40 overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all',
                  )}
                >
                  <div
                    className={cm.cn('relative aspect-[4/3] bg-surface-container overflow-hidden')}
                  >
                    <div
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'center' }),
                        'w-full h-full',
                      )}
                      aria-hidden="true"
                      style={{ background: 'var(--color-surface-gradient)' }}
                    >
                      <span className={cm.cn('material-symbols-outlined text-5xl text-primary/60')}>
                        image
                      </span>
                    </div>
                    <div
                      className={cm.cn(
                        'absolute top-2 left-2 px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest text-white shadow-sm',
                      )}
                      style={{ background: 'var(--color-accent)' }}
                    >
                      {t(
                        'landing.bidsCount',
                        { count: p.bid_count },
                        { defaultValue: '{{count}} bids' },
                      )}
                    </div>
                    <div
                      className={cm.cn(
                        'absolute inset-x-0 bottom-0 px-2 py-1 bg-foreground/85 text-white flex items-center justify-center gap-1 text-xs font-mono tabular-nums',
                      )}
                    >
                      <span
                        className={cm.cn('material-symbols-outlined text-xs')}
                        aria-hidden="true"
                      >
                        timer
                      </span>
                      {fmtCountdown(p.ends_at)}
                    </div>
                  </div>
                  <div className={cm.cn(cm.sp('p', 4), cm.stack(2))}>
                    <p
                      className={cm.cn(
                        'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                      )}
                    >
                      {p.category}
                    </p>
                    <h3 className={cm.cn(cm.textSize('sm'), 'font-bold leading-snug line-clamp-2')}>
                      {p.title}
                    </h3>
                    <div className={cm.flex({ align: 'baseline', justify: 'between' })}>
                      <span className={cm.cn(cm.textSize('xs'), cm.textMuted)}>
                        {t('landing.currentBid', {}, { defaultValue: 'Current bid' })}
                      </span>
                      <span
                        className={cm.cn('text-lg font-extrabold tabular-nums')}
                        style={{ color: 'var(--color-primary)' }}
                      >
                        {fmt(p.current_bid_cents)}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Explore categories — the Stitch design's category grid. */}
        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-16')}>
          <div className={cm.cn(cm.flex({ align: 'end', justify: 'between' }), cm.sp('mb', 6))}>
            <div>
              <h2 className={cm.cn('text-3xl font-extrabold tracking-tight')}>
                {t('landing.exploreHeading', {}, { defaultValue: 'Explore Categories' })}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), cm.textMuted)}>
                {t(
                  'landing.exploreSubheading',
                  {},
                  {
                    defaultValue: 'Five floors, one gavel — every category curated by specialists.',
                  },
                )}
              </p>
            </div>
          </div>
          <div
            className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-2 lg:grid-cols-4 lg:grid-rows-2')}
          >
            {EXPLORE_CATEGORIES.map((c) => {
              const count = categoryCounts[c.key] ?? 0
              return (
                <Link
                  key={c.key}
                  to={`/auctions#cat=${c.key}`}
                  data-mol-id={`landing-category-${c.key}`}
                  className={cm.cn(
                    'group relative rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all min-h-40',
                    c.featured ? 'lg:col-span-2 lg:row-span-2 min-h-72' : '',
                  )}
                  style={{ background: CATEGORY_TILE_BG[c.key] }}
                >
                  <span
                    className={cm.cn(
                      'material-symbols-outlined absolute -right-4 -bottom-4 text-8xl select-none',
                    )}
                    aria-hidden="true"
                    style={{ color: 'color-mix(in srgb, white 18%, transparent)' }}
                  >
                    {c.icon}
                  </span>
                  <div
                    className={cm.cn(
                      cm.flex({ direction: 'col', gap: 'xs' }),
                      cm.sp('p', 5),
                      'relative h-full justify-end',
                    )}
                  >
                    <h3
                      className={cm.cn(
                        c.featured ? 'text-2xl' : 'text-lg',
                        'font-extrabold tracking-tight text-white',
                      )}
                    >
                      {t(`landing.category.${c.key}`, {}, { defaultValue: c.defaultLabel })}
                    </h3>
                    <p className={cm.cn(cm.textSize('sm'), 'font-medium text-white')}>
                      {t(
                        'landing.categoryActiveCount',
                        { count },
                        {
                          defaultValue: '{{count}} active auctions',
                        },
                      )}
                    </p>
                    <span
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'center' }),
                        'absolute top-4 right-4 w-9 h-9 rounded-full bg-white/20 backdrop-blur-md text-white translate-x-12 group-hover:translate-x-0 transition-transform',
                      )}
                      aria-hidden="true"
                    >
                      <span className={cm.cn('material-symbols-outlined text-lg')}>
                        arrow_forward
                      </span>
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>

        {/* Features */}
        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-20')}>
          <div className={cm.cn(cm.textCenter, cm.sp('mb', 12))}>
            <p className={cm.cn('text-xs font-black uppercase tracking-widest text-primary mb-3')}>
              {t('landing.featuresEyebrow', {}, { defaultValue: 'Why bidders trust us' })}
            </p>
            <h2 className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight')}>
              {t('landing.featuresHeading', {}, { defaultValue: 'Bidding done right.' })}
            </h2>
          </div>
          <div
            className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4')}
          >
            {FEATURES.map((f) => (
              <div
                key={f.key}
                className={cm.cn(
                  cm.sp('p', 6),
                  'bg-surface-container-lowest rounded-lg border border-outline-variant/40 hover:shadow-xl hover:shadow-on-surface/5 transition-all group',
                )}
              >
                <div
                  className={cm.cn(
                    cm.sp('p', 3),
                    'inline-flex bg-surface rounded-xl shadow-sm group-hover:scale-110 transition-transform',
                    f.tint,
                  )}
                >
                  <span className={cm.cn('material-symbols-outlined text-3xl')} aria-hidden="true">
                    {f.icon}
                  </span>
                </div>
                <h3
                  className={cm.cn(cm.textSize('lg'), cm.sp('mt', 5), cm.sp('mb', 2), 'font-bold')}
                >
                  {t(`landing.feature.${f.key}.title`, {}, { defaultValue: f.defaultTitle })}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
                  {t(`landing.feature.${f.key}.body`, {}, { defaultValue: f.defaultBody })}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Seller CTA */}
        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-16')}>
          <div
            className={cm.cn('relative overflow-hidden rounded-xl shadow-2xl text-white')}
            style={{ background: 'var(--color-timer)' }}
          >
            {/* Radial accent glow from the top-right, per the design */}
            <div
              className={cm.cn('absolute inset-0 opacity-20 pointer-events-none')}
              style={{
                background:
                  'radial-gradient(circle at top right, var(--color-accent), transparent 55%)',
              }}
              aria-hidden="true"
            />
            <div
              className={cm.cn(
                'relative p-10 md:p-16 grid grid-cols-1 md:grid-cols-2 gap-10 items-center',
              )}
            >
              <div>
                <p
                  className={cm.cn('text-xs font-black uppercase tracking-widest mb-3 opacity-70')}
                >
                  {t('landing.sellerEyebrow', {}, { defaultValue: 'For sellers' })}
                </p>
                <h2 className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight mb-4')}>
                  {t(
                    'landing.sellerHeading',
                    {},
                    { defaultValue: 'Ready to sell? List in minutes.' },
                  )}
                </h2>
                <p className={cm.cn('text-base text-white/80 max-w-md leading-relaxed mb-6')}>
                  {t(
                    'landing.sellerBody',
                    {},
                    {
                      defaultValue:
                        'Free appraisals, white-glove logistics, and instant payout when the gavel falls.',
                    },
                  )}
                </p>
                <Link
                  to="/signup"
                  className={cm.cn(
                    cm.sp('px', 8),
                    cm.sp('py', 4),
                    'rounded-full inline-flex items-center gap-2 font-bold transition-transform hover:-translate-y-0.5',
                  )}
                  style={{ background: 'var(--color-accent)', color: 'white' }}
                >
                  {t('landing.sellerCta', {}, { defaultValue: 'Start selling' })}
                  <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                    arrow_forward
                  </span>
                </Link>
              </div>
              <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-2')}>
                <div className={cm.cn('rounded-xl bg-surface/10 backdrop-blur-sm p-5')}>
                  <p className={cm.cn('text-3xl font-extrabold tabular-nums tracking-tight')}>8%</p>
                  <p
                    className={cm.cn('text-xs font-bold uppercase tracking-widest opacity-70 mt-1')}
                  >
                    {t('landing.sellerStatFee', {}, { defaultValue: 'Flat seller fee' })}
                  </p>
                </div>
                <div className={cm.cn('rounded-xl bg-surface/10 backdrop-blur-sm p-5')}>
                  <p className={cm.cn('text-3xl font-extrabold tabular-nums tracking-tight')}>
                    48h
                  </p>
                  <p
                    className={cm.cn('text-xs font-bold uppercase tracking-widest opacity-70 mt-1')}
                  >
                    {t('landing.sellerStatPayout', {}, { defaultValue: 'Avg payout time' })}
                  </p>
                </div>
                <div className={cm.cn('rounded-xl bg-surface/10 backdrop-blur-sm p-5')}>
                  <p className={cm.cn('text-3xl font-extrabold tabular-nums tracking-tight')}>
                    240K
                  </p>
                  <p
                    className={cm.cn('text-xs font-bold uppercase tracking-widest opacity-70 mt-1')}
                  >
                    {t('landing.sellerStatBuyers', {}, { defaultValue: 'Verified buyers' })}
                  </p>
                </div>
                <div className={cm.cn('rounded-xl bg-surface/10 backdrop-blur-sm p-5')}>
                  <p className={cm.cn('text-3xl font-extrabold tabular-nums tracking-tight')}>
                    98%
                  </p>
                  <p
                    className={cm.cn('text-xs font-bold uppercase tracking-widest opacity-70 mt-1')}
                  >
                    {t('landing.sellerStatReserve', {}, { defaultValue: 'Reserve hit rate' })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer
        className={cm.cn('border-t border-outline-variant/40')}
        style={{ background: 'var(--color-surface-secondary)' }}
      >
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.mxAuto,
            cm.sp('px', 6),
            'py-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-sm',
          )}
        >
          <div className={cm.cn('col-span-2 md:col-span-1')}>
            <div>
              <BrandWordmark as="span" size="md" footer />
            </div>
            <p className={cm.cn('mt-3 text-on-surface-variant leading-relaxed')}>
              {t(
                'landing.footerTagline',
                {},
                {
                  defaultValue:
                    'The premier destination for live online auctions. Rare finds, verified sellers, real-time bidding.',
                },
              )}
            </p>
          </div>
          <div>
            <p className={cm.cn('font-bold text-on-surface mb-3')}>
              {t('landing.footerBuyHeading', {}, { defaultValue: 'Buy' })}
            </p>
            <ul className={cm.cn('space-y-2 text-on-surface-variant')}>
              <li>
                <Link to="/auctions">
                  {t('landing.footerBrowse', {}, { defaultValue: 'Browse auctions' })}
                </Link>
              </li>
              <li>
                <Link to="/help">
                  {t('landing.footerHowToBid', {}, { defaultValue: 'How to bid' })}
                </Link>
              </li>
              <li>
                <Link to="/help">
                  {t('landing.footerProtection', {}, { defaultValue: 'Buyer protection' })}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className={cm.cn('font-bold text-on-surface mb-3')}>
              {t('landing.footerSellHeading', {}, { defaultValue: 'Sell' })}
            </p>
            <ul className={cm.cn('space-y-2 text-on-surface-variant')}>
              <li>
                <Link to="/signup">
                  {t('landing.footerStartSelling', {}, { defaultValue: 'Start selling' })}
                </Link>
              </li>
              <li>
                <Link to="/login">
                  {t('landing.footerSellerHub', {}, { defaultValue: 'Seller hub' })}
                </Link>
              </li>
              <li>
                <Link to="/help">
                  {t('landing.footerFees', {}, { defaultValue: 'Fees & payouts' })}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className={cm.cn('font-bold text-on-surface mb-3')}>
              {t('form.company', {}, { defaultValue: 'Company' })}
            </p>
            <ul className={cm.cn('space-y-2 text-on-surface-variant')}>
              <li>
                <Link to="/about">
                  {t('footer.about', { appName: APP_NAME }, { defaultValue: 'About {{appName}}' })}
                </Link>
              </li>
              <li>
                <Link to="/terms">
                  {t('landing.footerTerms', {}, { defaultValue: 'Terms of service' })}
                </Link>
              </li>
              <li>
                <Link to="/privacy">
                  {t('landing.footerPrivacy', {}, { defaultValue: 'Privacy policy' })}
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className={cm.cn('border-t border-outline-variant/40 py-6')}>
          <p className={cm.cn(cm.textCenter, cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'common.copyrightAllRightsReserved',
              { year: new Date().getFullYear(), app: APP_NAME },
              { defaultValue: '© {{year}} {{app}}. All rights reserved.' },
            )}
          </p>
        </div>
      </footer>
    </div>
  )
}

export default Landing
