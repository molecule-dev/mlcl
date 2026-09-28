import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { DestinationOrbCard } from '../components/DestinationOrbCard.js'
import { PublicSiteFooter } from '../components/PublicSiteFooter.js'
import { TripCountdownHeroCard } from '../components/TripCountdownHeroCard.js'
import { TripCoverCard } from '../components/TripCoverCard.js'
import { SAMPLE_DESTINATIONS, SAMPLE_TRIPS, SAMPLE_UPCOMING_TRIP } from '../lib/sampleData.js'

const FEATURE_TRIAD = [
  {
    id: 'feat-day',
    icon: 'view_timeline',
    title: 'Day-by-day timelines',
    body: 'Drag stops to reorder, drop in transport segments, and watch the whole itinerary recalculate as a single living document.',
  },
  {
    id: 'feat-collab',
    icon: 'group',
    title: 'Plan together, in real time',
    body: 'Invite up to five collaborators per trip — every change syncs live, and comments thread under each stop.',
  },
  {
    id: 'feat-bookings',
    icon: 'confirmation_number',
    title: 'Bookings in one inbox',
    body: 'Forward confirmation emails to bookings@waypoint.app and the flight, hotel, and activity details land directly on the day they belong to.',
  },
] as const

const TRUST_BADGES = [
  { icon: 'shield_lock', label: 'End-to-end encrypted itineraries' },
  { icon: 'workspace_premium', label: 'Used by 12,000+ travelers' },
  { icon: 'verified', label: 'No ads. No data resold.' },
] as const

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()
  const previewDestinations = SAMPLE_DESTINATIONS.slice(0, 4)
  const previewTrips = SAMPLE_TRIPS.filter((t) => t.status !== 'cancelled').slice(0, 3)

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
              className="material-symbols-outlined text-primary text-3xl"
              aria-hidden="true"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              explore
            </span>
            <span
              className={cm.cn(
                cm.textSize('2xl'),
                cm.fontWeight('extrabold'),
                'text-primary tracking-tight',
              )}
              style={{ fontFamily: 'var(--font-headline)' }}
            >
              {APP_NAME}
            </span>
          </Link>
          <div className={cm.flex({ align: 'center', gap: 'lg' })}>
            <a
              href="#features"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'hidden md:inline text-on-surface-variant hover:text-primary',
              )}
            >
              {t('common.howItWorks', {}, { defaultValue: 'How it works' })}
            </a>
            <a
              href="#preview"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'hidden md:inline text-on-surface-variant hover:text-primary',
              )}
            >
              {t(
                'landing.nav.preview',
                { appName: APP_NAME },
                { defaultValue: 'Inside {{appName}}' },
              )}
            </a>
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                data-mol-id="nav-go-to-dashboard"
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
                  {t('landing.nav.join', {}, { defaultValue: 'Start a free trip' })}
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
            cm.sp('pt', 16),
            cm.sp('pb', 12),
            cm.mxAuto,
          )}
        >
          <div className={cm.cn('grid grid-cols-1 lg:grid-cols-12 gap-10 items-center')}>
            <div className={'lg:col-span-7'}>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-[0.25em] text-primary',
                )}
              >
                {t(
                  'landing.hero.eyebrow',
                  { tagline: APP_TAGLINE },
                  { defaultValue: 'Trip planner · {{tagline}}' },
                )}
              </p>
              <h1
                className={cm.cn(
                  cm.sp('mt', 4),
                  'text-5xl md:text-6xl lg:text-7xl tracking-tight leading-[0.95] font-extrabold',
                )}
                style={{ fontFamily: 'var(--font-headline)' }}
              >
                {t('landing.hero.title', {}, { defaultValue: 'Plan it once. Wander it together.' })}
              </h1>
              <p
                className={cm.cn(
                  cm.textSize('lg'),
                  cm.sp('mt', 6),
                  cm.maxW('xl'),
                  'text-on-surface-variant leading-relaxed',
                )}
              >
                {t(
                  'landing.hero.subtitle',
                  { appName: APP_NAME },
                  {
                    defaultValue:
                      '{{appName}} turns a folder full of half-formed plans into a shared, day-by-day itinerary your group can actually follow — with bookings, maps, and budget tracked in one place.',
                  },
                )}
              </p>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }),
                  cm.sp('mt', 8),
                )}
              >
                <Link
                  to="/signup"
                  className={cm.cn(
                    cm.sp('px', 8),
                    cm.sp('py', 3),
                    cm.fontWeight('bold'),
                    cm.flex({ align: 'center', gap: 'sm' }),
                    'rounded-full bg-primary text-on-primary hover:bg-primary-container transition-colors shadow-lg',
                  )}
                >
                  {t('landing.hero.ctaPrimary', {}, { defaultValue: 'Start a free trip' })}
                  <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                    arrow_forward
                  </span>
                </Link>
                <a
                  href="#preview"
                  className={cm.cn(
                    cm.sp('px', 8),
                    cm.sp('py', 3),
                    cm.fontWeight('semibold'),
                    'rounded-full border border-outline-variant text-on-surface hover:border-primary hover:text-primary transition-colors',
                  )}
                >
                  {t('landing.hero.ctaSecondary', {}, { defaultValue: 'See a sample trip' })}
                </a>
              </div>
              <ul
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'lg', wrap: 'wrap' }),
                  cm.sp('mt', 8),
                )}
              >
                {TRUST_BADGES.map((b) => (
                  <li
                    key={b.label}
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'sm' }),
                      cm.textSize('sm'),
                      'text-on-surface-variant',
                    )}
                  >
                    <span
                      className="material-symbols-outlined text-accent"
                      aria-hidden="true"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      {b.icon}
                    </span>
                    {t(`landing.hero.trust.${b.icon}`, {}, { defaultValue: b.label })}
                  </li>
                ))}
              </ul>
            </div>
            <div className={'lg:col-span-5'}>
              <TripCountdownHeroCard trip={SAMPLE_UPCOMING_TRIP} />
            </div>
          </div>
        </section>

        <section id="features" className={cm.cn('bg-surface-container-low')}>
          <div className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.sp('py', 20), cm.mxAuto)}>
            <div className={cm.cn(cm.maxW('2xl'))}>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-[0.25em] text-primary',
                )}
              >
                {t(
                  'landing.features.eyebrow',
                  { appName: APP_NAME },
                  { defaultValue: 'How {{appName}} works' },
                )}
              </p>
              <h2
                className={cm.cn(
                  cm.textSize('4xl'),
                  cm.fontWeight('extrabold'),
                  cm.sp('mt', 2),
                  'leading-tight tracking-tight',
                )}
                style={{ fontFamily: 'var(--font-headline)' }}
              >
                {t(
                  'landing.features.heading',
                  {},
                  { defaultValue: 'Built for travelers, not spreadsheets.' },
                )}
              </h2>
            </div>
            <div className={cm.cn('grid grid-cols-1 md:grid-cols-3 gap-6', cm.sp('mt', 10))}>
              {FEATURE_TRIAD.map((f) => (
                <article
                  key={f.id}
                  className={cm.cn(
                    cm.sp('p', 6),
                    'bg-surface rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all border-l-4 border-primary',
                  )}
                >
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      'w-12 h-12 rounded-2xl bg-primary-container text-on-primary-container',
                    )}
                  >
                    <span className={'material-symbols-outlined text-2xl'} aria-hidden="true">
                      {f.icon}
                    </span>
                  </span>
                  <h3
                    className={cm.cn(
                      cm.textSize('xl'),
                      cm.fontWeight('extrabold'),
                      cm.sp('mt', 4),
                      'leading-snug tracking-tight',
                    )}
                    style={{ fontFamily: 'var(--font-headline)' }}
                  >
                    {t(`landing.features.${f.id}.title`, {}, { defaultValue: f.title })}
                  </h3>
                  <p
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.sp('mt', 3),
                      'text-on-surface-variant leading-relaxed',
                    )}
                  >
                    {t(`landing.features.${f.id}.body`, {}, { defaultValue: f.body })}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          id="preview"
          className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.sp('py', 20), cm.mxAuto)}
        >
          <div
            className={cm.cn(
              cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 'md' }),
              cm.sp('mb', 8),
            )}
          >
            <div>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-[0.25em] text-primary',
                )}
              >
                {t(
                  'landing.preview.eyebrow',
                  { appName: APP_NAME },
                  { defaultValue: 'Inside {{appName}}' },
                )}
              </p>
              <h2
                className={cm.cn(
                  cm.textSize('4xl'),
                  cm.fontWeight('extrabold'),
                  cm.sp('mt', 2),
                  'leading-tight tracking-tight',
                )}
                style={{ fontFamily: 'var(--font-headline)' }}
              >
                {t(
                  'landing.preview.heading',
                  {},
                  { defaultValue: 'A few trips that travelers are wandering right now' },
                )}
              </h2>
            </div>
            <Link
              to="/signup"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                cm.flex({ align: 'center', gap: 'xs' }),
                'text-primary hover:underline',
              )}
            >
              {t('landing.preview.cta', {}, { defaultValue: 'Plan one of your own' })}
              <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          </div>
          <div className={cm.cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6')}>
            {previewTrips.map((trip) => (
              <TripCoverCard key={trip.id} trip={trip} />
            ))}
          </div>
        </section>

        <section className={cm.cn('bg-surface-container-low')}>
          <div className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.sp('py', 20), cm.mxAuto)}>
            <div
              className={cm.cn(
                cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 'md' }),
                cm.sp('mb', 8),
              )}
            >
              <div>
                <p
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-[0.25em] text-primary',
                  )}
                >
                  {t('landing.destinations.eyebrow', {}, { defaultValue: 'Where to next' })}
                </p>
                <h2
                  className={cm.cn(
                    cm.textSize('4xl'),
                    cm.fontWeight('extrabold'),
                    cm.sp('mt', 2),
                    'leading-tight tracking-tight',
                  )}
                  style={{ fontFamily: 'var(--font-headline)' }}
                >
                  {t(
                    'landing.destinations.heading',
                    {},
                    { defaultValue: 'Editor-curated destinations' },
                  )}
                </h2>
              </div>
            </div>
            <div className={cm.cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5')}>
              {previewDestinations.map((d) => (
                <DestinationOrbCard key={d.id} destination={d} />
              ))}
            </div>
          </div>
        </section>

        <section className={cm.cn('bg-primary text-on-primary relative overflow-hidden')}>
          <div
            className={cm.cn(
              cm.w(96),
              cm.h(96),
              cm.roundedFull,
              'absolute -right-24 -bottom-24 bg-accent/40 blur-3xl',
            )}
            aria-hidden="true"
          />
          <div
            className={cm.cn(
              cm.w(80),
              cm.h(80),
              cm.roundedFull,
              'absolute -left-24 -top-24 bg-surface/10 blur-3xl',
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
                // Not `text-accent`: this eyebrow sits inside the bg-primary
                // band, where orange-500 measures 1.91:1 against the teal.
                'uppercase tracking-[0.25em] text-accent-on-primary',
              )}
            >
              {t('landing.cta.eyebrow', {}, { defaultValue: 'Start on the free plan' })}
            </p>
            <h2
              className={cm.cn(
                cm.textSize('5xl'),
                cm.fontWeight('extrabold'),
                cm.sp('mt', 3),
                'leading-[0.95] tracking-tight',
              )}
              style={{ fontFamily: 'var(--font-headline)' }}
            >
              {t('landing.cta.heading', { tagline: APP_TAGLINE }, { defaultValue: '{{tagline}}.' })}
            </h2>
            <p
              className={cm.cn(
                cm.textSize('lg'),
                cm.sp('mt', 4),
                cm.maxW('2xl'),
                cm.mxAuto,
                'text-on-primary',
              )}
            >
              {t(
                'landing.cta.subheading',
                {},
                {
                  defaultValue:
                    'Up to five trips, five collaborators, and five stops on the free plan — with real-time sync included, and Pro lifting the caps when your plans grow.',
                },
              )}
            </p>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'md', justify: 'center', wrap: 'wrap' }),
                cm.sp('mt', 8),
              )}
            >
              <Link
                to="/signup"
                className={cm.cn(
                  cm.sp('px', 8),
                  cm.sp('py', 3),
                  cm.fontWeight('bold'),
                  'rounded-full bg-accent text-on-accent hover:bg-accent-hover transition-colors shadow-lg',
                )}
              >
                {t('landing.cta.signup', {}, { defaultValue: 'Create free account' })}
              </Link>
              <Link
                to="/login"
                className={cm.cn(
                  cm.sp('px', 8),
                  cm.sp('py', 3),
                  cm.fontWeight('semibold'),
                  'rounded-full border border-on-primary/40 text-on-primary hover:bg-on-primary/10 transition-colors',
                )}
              >
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PublicSiteFooter />
    </div>
  )
}
