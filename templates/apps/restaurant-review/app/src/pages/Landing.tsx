import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useHttpClient, useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { CuisineDiscoveryCard } from '../components/CuisineDiscoveryCard.js'
import { MorselHeroSearchCard } from '../components/MorselHeroSearchCard.js'
import {
  RestaurantListingCard,
  type RestaurantSummary,
} from '../components/RestaurantListingCard.js'
import { type ReviewExcerpt, ReviewExcerptCard } from '../components/ReviewExcerptCard.js'
import { loadContent } from '../config.js'
import { unwrapList } from '../lib/unwrap.js'

interface ApiRestaurant {
  id: string
  name: string
  cuisine: string
  neighborhood: string | null
  city: string
  rating: number | string
  review_count: number
  price_level: number
  thumbnail_url?: string | null
  badges?: string[] | string | null
}

interface ApiReview {
  id: string
  restaurant_id: string
  rating: number
  body: string
  helpful_count?: number
  photos?: string[] | string | null
  created_at: string
}

function landingAsArray(value: unknown): string[] {
  if (Array.isArray(value)) return value as string[]
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch (_error) {
      // JSON.parse failed on a malformed string; fall back to empty array
      return []
    }
  }
  return []
}

function landingToSummary(r: ApiRestaurant): RestaurantSummary {
  return {
    id: r.id,
    name: r.name,
    cuisine: r.cuisine,
    neighborhood: r.neighborhood ?? '',
    city: r.city,
    rating: typeof r.rating === 'string' ? Number(r.rating) : r.rating,
    review_count: r.review_count,
    price_level: r.price_level,
    thumbnail_url: r.thumbnail_url ?? undefined,
    badges: landingAsArray(r.badges),
    open_now: true,
  }
}

const FEATURED_CUISINES = [
  {
    id: 'c1',
    name: 'Italian',
    emoji: '🍝',
    subtitle: 'Hand-rolled pasta, slow-baked focaccia, Tuscan reds',
    thumbnail: 'https://picsum.photos/seed/morsel-italian/1200/900',
    pill: 'Trending',
  },
  {
    id: 'c2',
    name: 'Japanese',
    emoji: '🍣',
    subtitle: 'Omakase counters, izakayas, ramen joints worth the queue',
    thumbnail: 'https://picsum.photos/seed/morsel-japanese/1200/900',
    pill: 'Editor pick',
  },
  {
    id: 'c3',
    name: 'Mexican',
    emoji: '🌮',
    subtitle: 'Hand-pressed tortillas, mezcal bars, weekend birria pop-ups',
    thumbnail: 'https://picsum.photos/seed/morsel-mexican/1200/900',
    pill: 'Comfort',
  },
  {
    id: 'c4',
    name: 'Korean',
    emoji: '🥢',
    subtitle: 'Banchan-laden tables, KBBQ smoke, late-night fried chicken',
    thumbnail: 'https://picsum.photos/seed/morsel-korean/1200/900',
    pill: 'Late-night',
  },
] as const

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const isAuthenticated = useIsAuthenticated()
  const [previewRestaurants, setPreviewRestaurants] = useState<RestaurantSummary[]>([])
  const [featuredReviews, setFeaturedReviews] = useState<ReviewExcerpt[]>([])
  const [railsLoaded, setRailsLoaded] = useState(false)

  // Hydrate the landing-page rails from the live API. Both endpoints are
  // public (no auth required) so this works pre-signin too.
  useEffect(() => {
    let cancelled = false
    Promise.all([
      http.get('/api/restaurants?limit=3&sort_by=rating&sort_order=desc').catch(() => null),
      http.get('/api/reviews?limit=2&sort_by=created_at&sort_order=desc').catch(() => null),
    ])
      .then(async ([restRes, revRes]) => {
        if (cancelled) return
        const all = unwrapList<ApiRestaurant>(restRes)
        setPreviewRestaurants(all.slice(0, 3).map(landingToSummary))
        const restMap = new Map(all.map((r) => [r.id, r]))
        const reviews = unwrapList<ApiReview>(revRes).slice(0, 2)
        const excerpts: ReviewExcerpt[] = reviews.map((r) => {
          const rest = restMap.get(r.restaurant_id)
          return {
            id: r.id,
            rating: r.rating,
            body: r.body,
            posted_at: r.created_at,
            helpful_count: r.helpful_count ?? 0,
            photo_urls: landingAsArray(r.photos),
            author: {
              id: 'anon',
              name: t(
                'landing.reviews.author',
                { appName: APP_NAME },
                { defaultValue: 'A {{appName}} diner' },
              ),
              review_count: 0,
            },
            restaurant: rest
              ? { id: rest.id, name: rest.name, cuisine: rest.cuisine }
              : {
                  id: r.restaurant_id,
                  name: t('landing.reviews.unknown', {}, { defaultValue: 'Restaurant' }),
                },
          }
        })
        setFeaturedReviews(excerpts)
      })
      .finally(() => {
        if (!cancelled) setRailsLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      <nav
        className={cm.cn(
          'sticky top-0 z-40 bg-surface/95 backdrop-blur-md border-b border-outline-variant/40',
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
          <Link to="/" className={cm.flex({ align: 'center', gap: 'sm' })}>
            <span
              className={cm.cn(cm.textSize('3xl'), 'text-primary')}
              style={{ fontFamily: '"DM Serif Display", Georgia, serif', fontWeight: 400 }}
            >
              {APP_NAME}
            </span>
          </Link>
          <div className={cm.flex({ align: 'center', gap: 'lg' })}>
            <Link
              to="/discover"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'hidden md:inline text-on-surface-variant hover:text-primary',
              )}
            >
              {t('nav.discover', {}, { defaultValue: 'Discover' })}
            </Link>
            <Link
              to="/lists"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'hidden md:inline text-on-surface-variant hover:text-primary',
              )}
            >
              {t('landing.nav.lists', {}, { defaultValue: 'Lists' })}
            </Link>
            <Link
              to="/pricing"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'hidden md:inline text-on-surface-variant hover:text-primary',
              )}
            >
              {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
            </Link>
            {isAuthenticated ? (
              <Link
                to="/discover"
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('bold'),
                  'rounded-full bg-primary text-on-primary hover:bg-primary-container transition-colors',
                )}
              >
                {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'hidden md:inline text-on-surface hover:text-primary',
                  )}
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </Link>
                <Link
                  to="/signup"
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    cm.fontWeight('bold'),
                    'rounded-full bg-primary text-on-primary hover:bg-primary-container transition-colors',
                  )}
                >
                  {t(
                    'landing.nav.join',
                    { appName: APP_NAME },
                    { defaultValue: 'Join {{appName}}' },
                  )}
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main>
        <section
          className={cm.cn(
            cm.maxW('7xl'),
            cm.sp('px', 6),
            cm.sp('pt', 10),
            cm.sp('pb', 16),
            cm.mxAuto,
          )}
        >
          <MorselHeroSearchCard />
        </section>

        <section className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.sp('pb', 20), cm.mxAuto)}>
          <div className={cm.cn(cm.flex({ align: 'end', justify: 'between' }), cm.sp('mb', 8))}>
            <div>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-[0.3em] text-primary',
                )}
              >
                {t('landing.cuisines.eyebrow', {}, { defaultValue: 'Tonight, you crave' })}
              </p>
              <h2
                className={cm.cn(cm.textSize('4xl'), cm.sp('mt', 2), 'leading-tight')}
                style={{ fontFamily: '"DM Serif Display", Georgia, serif', fontWeight: 400 }}
              >
                {t('landing.cuisines.heading', {}, { defaultValue: 'Browse by appetite' })}
              </h2>
            </div>
            <Link
              to="/discover"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'text-primary hover:underline hidden md:inline-flex items-center gap-1',
              )}
            >
              {t('landing.cuisines.seeAll', {}, { defaultValue: 'All cuisines' })}
              <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          </div>
          <div className={cm.cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5')}>
            {FEATURED_CUISINES.map((c) => (
              <CuisineDiscoveryCard key={c.id} cuisine={c} />
            ))}
          </div>
        </section>

        <section className={cm.cn('bg-surface-container-low')}>
          <div className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.sp('py', 20), cm.mxAuto)}>
            <div className={cm.cn(cm.flex({ align: 'end', justify: 'between' }), cm.sp('mb', 8))}>
              <div>
                <p
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-[0.3em] text-primary',
                  )}
                >
                  {t(
                    'landing.preview.eyebrow',
                    { appName: APP_NAME },
                    { defaultValue: "What's new on {{appName}}" },
                  )}
                </p>
                <h2
                  className={cm.cn(cm.textSize('4xl'), cm.sp('mt', 2), 'leading-tight')}
                  style={{ fontFamily: '"DM Serif Display", Georgia, serif', fontWeight: 400 }}
                >
                  {t('landing.preview.heading', {}, { defaultValue: 'Tables worth a detour' })}
                </h2>
                <p
                  className={cm.cn(
                    cm.textSize('base'),
                    cm.sp('mt', 2),
                    cm.maxW('xl'),
                    'text-on-surface-variant',
                  )}
                >
                  {t(
                    'landing.preview.subheading',
                    {},
                    {
                      defaultValue:
                        'Vetted by neighbors, photographed at the table, ranked by visit not vibes — three places worth the calendar block this week.',
                    },
                  )}
                </p>
              </div>
              <Link
                to="/discover"
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'text-primary hover:underline hidden md:inline-flex items-center gap-1',
                )}
              >
                {t('landing.preview.browseAll', {}, { defaultValue: 'Browse all spots' })}
                <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                  arrow_forward
                </span>
              </Link>
            </div>
            <div
              data-testid="landing-preview-restaurants"
              className={cm.cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6')}
            >
              {previewRestaurants.map((r) => (
                <RestaurantListingCard key={r.id} restaurant={r} />
              ))}
              {railsLoaded && previewRestaurants.length === 0 ? (
                <p
                  className={cm.cn(
                    cm.textSize('sm'),
                    'text-on-surface-variant md:col-span-2 lg:col-span-3',
                  )}
                >
                  {t(
                    'landing.preview.unavailable',
                    {},
                    { defaultValue: 'Live picks are unavailable right now — check back soon.' },
                  )}
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <section className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.sp('py', 20), cm.mxAuto)}>
          <div className={cm.cn(cm.flex({ align: 'end', justify: 'between' }), cm.sp('mb', 8))}>
            <div>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-[0.3em] text-primary',
                )}
              >
                {t('landing.reviews.eyebrow', {}, { defaultValue: 'Tasting notes' })}
              </p>
              <h2
                className={cm.cn(cm.textSize('4xl'), cm.sp('mt', 2), 'leading-tight')}
                style={{ fontFamily: '"DM Serif Display", Georgia, serif', fontWeight: 400 }}
              >
                {t('landing.reviews.heading', {}, { defaultValue: 'From the latest plates' })}
              </h2>
            </div>
          </div>
          <div
            data-testid="landing-featured-reviews"
            className={cm.cn('grid grid-cols-1 md:grid-cols-2 gap-6')}
          >
            {featuredReviews.map((rv) => (
              <ReviewExcerptCard key={rv.id} review={rv} />
            ))}
            {railsLoaded && featuredReviews.length === 0 ? (
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant md:col-span-2')}>
                {t(
                  'landing.reviews.unavailable',
                  {},
                  { defaultValue: 'No tasting notes yet — your review could be the first.' },
                )}
              </p>
            ) : null}
          </div>
        </section>

        <section className={cm.cn('bg-primary text-on-primary relative overflow-hidden')}>
          <div
            className={cm.cn(
              cm.w(96),
              cm.h(96),
              cm.roundedFull,
              'absolute -right-24 -bottom-24 bg-accent/35 blur-3xl',
            )}
            aria-hidden="true"
          />
          <div
            className={cm.cn(
              cm.w(80),
              cm.h(80),
              cm.roundedFull,
              'absolute -left-24 -top-24 bg-surface/15 blur-3xl',
            )}
            aria-hidden="true"
          />
          <div
            className={cm.cn(
              cm.maxW('5xl'),
              cm.sp('px', 6),
              cm.sp('py', 20),
              cm.textCenter,
              cm.mxAuto,
              'relative z-10',
            )}
          >
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-[0.3em] text-accent-on-primary',
              )}
            >
              {t(
                'landing.cta.eyebrow',
                { appName: APP_NAME },
                { defaultValue: 'Become a {{appName}} Tastemaker' },
              )}
            </p>
            <h2
              className={cm.cn(cm.textSize('5xl'), cm.sp('mt', 3), 'leading-[0.95]')}
              style={{ fontFamily: '"DM Serif Display", Georgia, serif', fontWeight: 400 }}
            >
              {t('landing.cta.heading', {}, { defaultValue: 'Stop scrolling. Start eating.' })}
            </h2>
            <p
              className={cm.cn(
                cm.textSize('lg'),
                cm.sp('mt', 4),
                cm.maxW('2xl'),
                cm.mxAuto,
                'text-white/90',
              )}
            >
              {t(
                'landing.cta.subheading',
                { appName: APP_NAME },
                {
                  defaultValue:
                    'Bookmark places, write a tasting note, build a list — {{appName}} is the fastest way to remember the spots you actually loved.',
                },
              )}
            </p>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'md', justify: 'center' }),
                cm.sp('mt', 8),
              )}
            >
              <Link
                to="/signup"
                className={cm.cn(
                  cm.sp('px', 8),
                  cm.sp('py', 3),
                  cm.fontWeight('bold'),
                  'rounded-full bg-accent text-on-accent hover:bg-accent/90 transition-colors shadow-lg',
                )}
              >
                {t('landing.cta.signup', {}, { defaultValue: 'Create free account' })}
              </Link>
              <Link
                to="/discover"
                className={cm.cn(
                  cm.sp('px', 8),
                  cm.sp('py', 3),
                  cm.fontWeight('semibold'),
                  'rounded-full border border-surface/40 text-white hover:bg-surface/10 transition-colors',
                )}
              >
                {t('landing.cta.explore', {}, { defaultValue: 'Browse spots' })}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className={cm.cn('bg-surface border-t border-outline-variant/40')}>
        <div className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.sp('py', 12), cm.mxAuto)}>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' }),
            )}
          >
            <div>
              <span
                className={cm.cn(cm.textSize('2xl'), 'text-primary')}
                style={{ fontFamily: '"DM Serif Display", Georgia, serif', fontWeight: 400 }}
              >
                {APP_NAME}
              </span>
              <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
                {t('landing.footer.tagline', {}, { defaultValue: 'Every bite tells a story.' })}
              </p>
            </div>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'lg', wrap: 'wrap' }),
                cm.textSize('sm'),
              )}
            >
              <Link to="/about" className={'text-on-surface-variant hover:text-primary'}>
                {t('nav.about', {}, { defaultValue: 'About' })}
              </Link>
              <Link to="/discover" className={'text-on-surface-variant hover:text-primary'}>
                {t('nav.discover', {}, { defaultValue: 'Discover' })}
              </Link>
              <Link to="/lists" className={'text-on-surface-variant hover:text-primary'}>
                {t('landing.footer.lists', {}, { defaultValue: 'Lists' })}
              </Link>
              <Link to="/pricing" className={'text-on-surface-variant hover:text-primary'}>
                {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
              </Link>
              <Link to="/login" className={'text-on-surface-variant hover:text-primary'}>
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
              <Link to="/signup" className={'text-on-surface-variant hover:text-primary'}>
                {t('auth.signup.createAccount', {}, { defaultValue: 'Create account' })}
              </Link>
              <LegalModalLinks
                linkClassName={'text-on-surface-variant hover:text-primary'}
                appName={APP_NAME}
                loadContent={loadContent}
                privacyLabel={t('nav.privacy', {}, { defaultValue: 'Privacy' })}
                termsLabel={t('nav.terms', {}, { defaultValue: 'Terms' })}
              />
            </div>
          </div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.sp('mt', 8),
              cm.textCenter,
              'text-on-surface-variant',
            )}
          >
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
