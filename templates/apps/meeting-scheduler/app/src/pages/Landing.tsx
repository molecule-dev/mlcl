import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { BrandWordmark } from '../components/BrandWordmark.js'

/**
 * Gradient CTA + brand treatment shared by nav, hero and closing CTA —
 * Stitch landing design: deep-indigo `from-primary to-primary-container`
 * gradient fills with rounded-xl corners.
 */
const GRADIENT_CTA =
  'bg-gradient-to-br from-primary to-primary-dark text-white hover:opacity-90 transition-opacity'

const FEATURES = [
  {
    key: 'availability',
    defaultTitle: 'Availability that respects you',
    defaultBody: 'Set weekly hours, buffers, and timezone-aware overrides — {{app}} does the math.',
    icon: 'schedule',
    tall: false,
    tile: 'bg-primary-fixed text-primary',
  },
  {
    key: 'sync',
    defaultTitle: 'Two-way calendar sync',
    defaultBody:
      'Connect Google, Outlook, and Apple Calendar — {{app}} writes both ways and avoids conflicts.',
    icon: 'sync_alt',
    tall: false,
    tile: 'bg-secondary-fixed text-secondary',
  },
  {
    key: 'booking',
    defaultTitle: 'Polished booking links',
    defaultBody: 'Share /your-name/30min and let invitees pick a slot from a calm, branded page.',
    icon: 'tune',
    tile: 'bg-tertiary-fixed text-tertiary',
    tall: true,
  },
  {
    key: 'reminders',
    defaultTitle: 'Considerate reminders',
    defaultBody:
      'Email and push reminders for both sides, plus reschedule links that respect time zones.',
    icon: 'notifications_active',
    tall: false,
    tile: 'bg-primary-fixed text-primary',
  },
  {
    key: 'roundRobin',
    defaultTitle: 'Round-robin routing',
    defaultBody:
      'Distribute inbound meetings fairly across your team based on real-time availability.',
    icon: 'alt_route',
    tall: false,
    tile: 'bg-secondary-fixed text-secondary',
  },
] as const

/** Mini event-type rows inside the tall "booking links" bento card. */
const EVENT_TYPES = [
  {
    key: 'coffee',
    icon: 'coffee',
    tile: 'bg-primary-fixed text-primary',
    name: 'Coffee Chat',
    duration: '15 min',
  },
  {
    key: 'teamSync',
    icon: 'group',
    tile: 'bg-secondary-fixed text-secondary',
    name: 'Team Sync',
    duration: '45 min',
  },
  {
    key: 'deepDive',
    icon: 'diversity_3',
    tile: 'bg-tertiary-fixed text-tertiary',
    name: 'Deep Dive',
    duration: '60 min',
  },
] as const

interface PublicService {
  id: string
  name: string
  slug: string
  description: string | null
  duration_minutes: number
  price_cents: number
}

/** "Where schedules align" → gradient-clipped final word (Stitch hero). */
function splitLastWord(text: string): [string, string] {
  const idx = text.lastIndexOf(' ')
  return idx === -1 ? ['', text] : [text.slice(0, idx + 1), text.slice(idx + 1)]
}

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()
  const http = useHttpClient()
  const year = new Date().getFullYear()
  const [services, setServices] = useState<PublicService[]>([])
  const [servicesError, setServicesError] = useState(false)

  // Public catalog — signed-out visitors included. NEVER call an authed
  // endpoint (e.g. GET /api/event-types) from this page: it 401s for every
  // visitor (the m018 failure).
  useEffect(() => {
    let cancelled = false
    http
      .get('/api/event-types/public/services')
      .then((res) => {
        if (cancelled) return
        const body = res.data as { services?: PublicService[] }
        setServices(Array.isArray(body.services) ? body.services : [])
      })
      .catch(() => {
        if (cancelled) return
        setServicesError(true)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const [heroHead, heroTail] = splitLastWord(
    t('landing.heroTitle', { tagline: APP_TAGLINE }, { defaultValue: '{{tagline}}.' }).replace(
      /\.$/,
      '',
    ),
  )

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      <nav
        className={cm.cn(
          'sticky top-0 z-50 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/40',
        )}
      >
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.sp('px', 6),
            cm.flex({ align: 'center', justify: 'between' }),
            cm.mxAuto,
            'h-20',
          )}
        >
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }))}>
            <Link to="/" className={cm.cn(cm.textSize('xl'), 'font-black tracking-tighter')}>
              <BrandWordmark as="span" />
            </Link>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'lg' }),
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'hidden md:flex tracking-tight',
              )}
            >
              <a
                href="#features"
                className={cm.cn('text-on-surface-variant hover:text-primary transition-colors')}
              >
                {t('nav.features', {}, { defaultValue: 'Features' })}
              </a>
              <Link
                to="/pricing"
                className={cm.cn('text-on-surface-variant hover:text-primary transition-colors')}
              >
                {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
              </Link>
              <Link
                to="/about"
                className={cm.cn('text-on-surface-variant hover:text-primary transition-colors')}
              >
                {t('footer.about', { appName: APP_NAME }, { defaultValue: 'About' })}
              </Link>
            </div>
          </div>
          <div className={cm.flex({ align: 'center', gap: 'md' })}>
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                data-mol-id="landing-nav-dashboard"
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.fontWeight('semibold'),
                  cm.textSize('sm'),
                  GRADIENT_CTA,
                  'rounded-lg',
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
                    cm.fontWeight('medium'),
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    'text-primary hover:text-primary/80 transition-colors',
                  )}
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </Link>
                <Link
                  to="/signup"
                  data-mol-id="landing-nav-get-started"
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 2),
                    cm.fontWeight('medium'),
                    cm.textSize('sm'),
                    'rounded-lg',
                    GRADIENT_CTA,
                  )}
                >
                  {t('landing.getStarted', {}, { defaultValue: 'Start scheduling' })}
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main>
        <section
          className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'pt-16 pb-20 md:pt-24')}
        >
          <div className={cm.cn('grid grid-cols-1 lg:grid-cols-2 gap-16 items-center')}>
            <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tighter leading-[1.1] text-on-surface">
                {heroHead}
                <span className="bg-gradient-to-br from-primary to-primary-dark bg-clip-text text-transparent">
                  {heroTail}
                </span>
              </h1>
              <p
                className={cm.cn(
                  cm.textSize('xl'),
                  'text-on-surface-variant font-light max-w-lg leading-relaxed',
                )}
              >
                {t(
                  'landing.heroSubtitle',
                  { app: APP_NAME },
                  {
                    defaultValue:
                      'Share a booking link, set your availability, and let {{app}} handle the calendar math across every timezone.',
                  },
                )}
              </p>
              <div className={cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' })}>
                <Link
                  to="/signup"
                  data-mol-id="landing-hero-cta"
                  className={cm.cn(
                    cm.sp('px', 8),
                    cm.sp('py', 4),
                    cm.fontWeight('semibold'),
                    'rounded-xl shadow-xl shadow-primary/20 inline-flex items-center gap-2',
                    GRADIENT_CTA,
                  )}
                >
                  {t('landing.heroCta', {}, { defaultValue: 'Create your booking link' })}
                  <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                    arrow_forward
                  </span>
                </Link>
                <Link
                  to="/pricing"
                  className={cm.cn(
                    cm.sp('px', 8),
                    cm.sp('py', 4),
                    cm.fontWeight('medium'),
                    'rounded-xl bg-surface-container-low text-on-surface hover:bg-surface-container transition-colors',
                  )}
                >
                  {t('landing.pricingCta', {}, { defaultValue: 'See pricing' })}
                </Link>
              </div>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  cm.textSize('sm'),
                  'text-on-surface-variant flex-wrap',
                )}
              >
                <span
                  className={cm.cn('material-symbols-outlined text-primary text-xl')}
                  aria-hidden="true"
                >
                  check_circle
                </span>
                <span>
                  {t('landing.trust.noCard', {}, { defaultValue: 'No credit card required' })}
                </span>
                <span
                  className={cm.cn('material-symbols-outlined text-primary text-xl ml-4')}
                  aria-hidden="true"
                >
                  check_circle
                </span>
                <span>{t('landing.trust.trial', {}, { defaultValue: '14-day free trial' })}</span>
              </div>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.sp('mt', 2),
                  'font-bold uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t(
                  'landing.socialProof',
                  {},
                  {
                    defaultValue: 'Trusted by founders, recruiters, and consultants worldwide',
                  },
                )}
              </p>
            </div>

            {/* Hero visual — asymmetric booking card over a blurred gradient
               blob (Stitch design). Static mock, no live data. */}
            <div
              className={cm.cn('relative h-[480px] lg:h-[560px] flex items-center justify-center')}
            >
              <div
                aria-hidden="true"
                className={cm.cn(
                  'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 rounded-full blur-3xl',
                  'bg-gradient-to-tr from-primary-light/60 to-secondary-light/60',
                )}
              />
              <div
                aria-hidden="true"
                className={cm.cn(
                  'relative z-10 w-full max-w-[420px] bg-surface-container-lowest rounded-2xl p-6 shadow-2xl shadow-on-surface/10 lg:translate-y-8',
                )}
              >
                <div className={cm.cn(cm.flex({ align: 'start', gap: 'md' }), cm.sp('mb', 6))}>
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      'w-14 h-14 rounded-full bg-primary-light text-primary font-bold shadow-sm',
                    )}
                  >
                    SJ
                  </div>
                  <div>
                    <h3 className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'))}>
                      {t('landing.bookingCard.name', {}, { defaultValue: 'Sarah Johnson' })}
                    </h3>
                    <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                      {t(
                        'landing.bookingCard.session',
                        {},
                        { defaultValue: 'Product Strategy Session' },
                      )}
                    </p>
                  </div>
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'xs' }),
                      cm.sp('px', 3),
                      cm.sp('py', 1),
                      cm.textSize('xs'),
                      cm.fontWeight('medium'),
                      'ml-auto bg-surface-container-low text-on-surface-variant rounded-full whitespace-nowrap',
                    )}
                  >
                    <span className={cm.cn('material-symbols-outlined text-sm')} aria-hidden="true">
                      schedule
                    </span>
                    30 min
                  </div>
                </div>
                {/* Timezone slider */}
                <div className={cm.sp('mb', 4)}>
                  <div
                    className={cm.cn(
                      cm.flex({ justify: 'between', align: 'center' }),
                      cm.sp('mb', 2),
                    )}
                  >
                    <span
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.fontWeight('semibold'),
                        'text-on-surface-variant uppercase tracking-wider',
                      )}
                    >
                      {t(
                        'landing.bookingCard.timezoneLabel',
                        {},
                        { defaultValue: 'Your timezone' },
                      )}
                    </span>
                    <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {t('landing.bookingCard.timezone', {}, { defaultValue: 'UTC -5 (EST)' })}
                    </span>
                  </div>
                  <div
                    className={cm.cn(
                      'h-2 bg-surface-container-high rounded-full relative overflow-hidden',
                    )}
                  >
                    <div
                      className={cm.cn(
                        'absolute top-0 left-1/3 w-1/4 h-full bg-primary rounded-full',
                      )}
                    />
                  </div>
                </div>
                {/* Time slots */}
                <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
                  <div
                    className={cm.cn(
                      cm.sp('p', 4),
                      cm.flex({ justify: 'between', align: 'center' }),
                      'rounded-xl bg-surface-container-low',
                    )}
                  >
                    <div className={cm.flex({ direction: 'col' })}>
                      <span className={cm.cn(cm.fontWeight('semibold'))}>
                        {t('landing.bookingCard.slot1', {}, { defaultValue: '9:00 AM' })}
                      </span>
                      <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                        {t('landing.bookingCard.date', {}, { defaultValue: 'Tuesday, Oct 24' })}
                      </span>
                    </div>
                    <span
                      className={cm.cn('material-symbols-outlined text-outline')}
                      aria-hidden="true"
                    >
                      chevron_right
                    </span>
                  </div>
                  <div
                    className={cm.cn(
                      cm.sp('p', 4),
                      cm.flex({ justify: 'between', align: 'center' }),
                      // text-primary on the light primary-fixed chip was 3.92:1
                      // (axe serious); text-on-primary-fixed is the pairing the
                      // framework mixes for this bg — 11.2:1 light / 11.4:1 dark.
                      'rounded-xl bg-primary-fixed text-on-primary-fixed shadow-lg shadow-primary/10',
                    )}
                  >
                    <div className={cm.flex({ direction: 'col' })}>
                      <span className={cm.cn(cm.fontWeight('bold'))}>
                        {t('landing.bookingCard.slot2', {}, { defaultValue: '10:30 AM' })}
                      </span>
                      {/* No opacity on text: #4f46e5 at 80% over the fixed bg was 2.95:1. */}
                      <span className={cm.cn(cm.textSize('xs'))}>
                        {t('landing.bookingCard.date', {}, { defaultValue: 'Tuesday, Oct 24' })}
                      </span>
                    </div>
                    <span
                      className={cm.cn('material-symbols-outlined font-bold')}
                      aria-hidden="true"
                    >
                      check
                    </span>
                  </div>
                  <div
                    className={cm.cn(
                      cm.sp('p', 4),
                      cm.flex({ justify: 'between', align: 'center' }),
                      'rounded-xl bg-surface-container-low',
                    )}
                  >
                    <div className={cm.flex({ direction: 'col' })}>
                      <span className={cm.cn(cm.fontWeight('semibold'))}>
                        {t('landing.bookingCard.slot3', {}, { defaultValue: '1:15 PM' })}
                      </span>
                      <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                        {t('landing.bookingCard.date', {}, { defaultValue: 'Tuesday, Oct 24' })}
                      </span>
                    </div>
                    <span
                      className={cm.cn('material-symbols-outlined text-outline')}
                      aria-hidden="true"
                    >
                      chevron_right
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="services"
          className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-20')}
        >
          <h2
            className={cm.cn(
              cm.sp('mb', 3),
              cm.textCenter,
              'text-3xl md:text-4xl font-extrabold tracking-tight',
            )}
          >
            {t('landing.servicesHeading', {}, { defaultValue: 'Services & pricing' })}
          </h2>
          <p
            className={cm.cn(
              cm.sp('mb', 12),
              cm.textCenter,
              cm.textSize('lg'),
              'text-on-surface-variant/80',
            )}
          >
            {t(
              'landing.servicesSubheading',
              {},
              {
                defaultValue:
                  'Pick a service, choose a time that suits you, and book in under a minute.',
              },
            )}
          </p>
          {servicesError ? (
            <p className={cm.cn(cm.textCenter, 'text-on-surface-variant')}>
              {t(
                'landing.servicesUnavailable',
                {},
                { defaultValue: 'Our price list is being updated — please check back shortly.' },
              )}
            </p>
          ) : (
            <div
              className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3')}
            >
              {services.map((svc) => (
                <article
                  key={svc.id}
                  data-testid={`service-card-${svc.slug}`}
                  className={cm.cn(
                    cm.flex({ direction: 'col' }),
                    cm.sp('p', 6),
                    'bg-surface-container-lowest rounded-2xl border border-outline-variant/30 hover:shadow-xl transition-shadow',
                  )}
                >
                  <div
                    className={cm.cn(
                      cm.flex({ justify: 'between', align: 'start' }),
                      cm.sp('mb', 2),
                    )}
                  >
                    <h3 className={cm.cn(cm.textSize('xl'), 'font-bold')}>{svc.name}</h3>
                    <span
                      data-testid={`service-price-${svc.slug}`}
                      className={cm.cn(
                        cm.textSize('lg'),
                        'font-extrabold text-primary whitespace-nowrap',
                      )}
                    >
                      {svc.price_cents > 0
                        ? `$${Math.round(svc.price_cents / 100)}`
                        : t('landing.freeLabel', {}, { defaultValue: 'Free' })}
                    </span>
                  </div>
                  {svc.description && (
                    <p
                      className={cm.cn(
                        cm.textSize('sm'),
                        cm.sp('mb', 4),
                        'text-on-surface-variant/80',
                      )}
                    >
                      {svc.description}
                    </p>
                  )}
                  <p
                    className={cm.cn(cm.textSize('sm'), cm.sp('mb', 6), 'text-on-surface-variant')}
                  >
                    {t(
                      'landing.durationLabel',
                      { minutes: svc.duration_minutes },
                      { defaultValue: '{{minutes}} minutes' },
                    )}
                  </p>
                  <Link
                    to={`/book/${svc.slug}`}
                    data-testid={`service-book-${svc.slug}`}
                    className={cm.cn(
                      cm.sp('px', 5),
                      cm.sp('py', 2),
                      'mt-auto',
                      'rounded-lg font-semibold text-center',
                      GRADIENT_CTA,
                    )}
                  >
                    {t('landing.bookNow', {}, { defaultValue: 'Book now' })}
                  </Link>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Features bento — "Engineered for your time" (Stitch). The booking
           links card spans two rows and carries mini event-type rows. */}
        <section
          id="features"
          className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-20')}
        >
          <div className={cm.textCenter}>
            <h2
              className={cm.cn(
                cm.sp('mb', 3),
                'text-3xl md:text-4xl font-extrabold tracking-tight',
              )}
            >
              {t(
                'landing.featuresHeading',
                {},
                { defaultValue: 'Meetings that schedule themselves' },
              )}
            </h2>
            <p
              className={cm.cn(
                cm.sp('mb', 12),
                cm.textSize('lg'),
                'text-on-surface-variant max-w-2xl mx-auto',
              )}
            >
              {t(
                'landing.featuresSubheading',
                {},
                {
                  defaultValue:
                    'Everything you need to orchestrate meetings across teams, borders, and tools without the back-and-forth.',
                },
              )}
            </p>
          </div>
          <div
            className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3')}
          >
            {FEATURES.map((f) => (
              <div
                key={f.key}
                className={cm.cn(
                  cm.sp('p', 8),
                  cm.flex({ direction: 'col' }),
                  'bg-surface-container-low rounded-2xl hover:bg-surface-container transition-colors duration-300',
                  f.tall ? 'lg:row-span-2' : '',
                )}
              >
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'w-12 h-12 rounded-xl',
                    cm.sp('mb', 6),
                    f.tile,
                  )}
                >
                  <span className="material-symbols-outlined" aria-hidden="true">
                    {f.icon}
                  </span>
                </div>
                <h3 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), cm.sp('mb', 2))}>
                  {t(`landing.feature.${f.key}.title`, {}, { defaultValue: f.defaultTitle })}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
                  {t(
                    `landing.feature.${f.key}.body`,
                    { app: APP_NAME },
                    { defaultValue: f.defaultBody },
                  )}
                </p>
                {f.tall ? (
                  <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), 'mt-auto pt-8')}>
                    {EVENT_TYPES.map((e) => (
                      <div
                        key={e.key}
                        className={cm.cn(
                          cm.flex({ align: 'center', gap: 'sm' }),
                          'bg-surface-container-lowest p-3 rounded-lg shadow-sm',
                        )}
                      >
                        <div
                          className={cm.cn(
                            cm.flex({ align: 'center', justify: 'center' }),
                            'w-8 h-8 rounded',
                            e.tile,
                          )}
                        >
                          <span
                            className={cm.cn('material-symbols-outlined text-sm')}
                            aria-hidden="true"
                          >
                            {e.icon}
                          </span>
                        </div>
                        <div>
                          <div className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                            {t(`landing.eventType.${e.key}.name`, {}, { defaultValue: e.name })}
                          </div>
                          <div className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                            {t(
                              `landing.eventType.${e.key}.duration`,
                              {},
                              { defaultValue: e.duration },
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        {/* Testimonial (Stitch) */}
        <section className={cm.cn(cm.maxW('4xl'), cm.mxAuto, cm.sp('px', 6), 'py-12')}>
          <div
            className={cm.cn('bg-surface-container-low rounded-3xl p-12 relative overflow-hidden')}
          >
            <span
              className={cm.cn(
                'material-symbols-outlined absolute top-8 left-8 text-6xl text-surface-container-highest rotate-180 opacity-50',
              )}
              aria-hidden="true"
            >
              format_quote
            </span>
            <div
              className={cm.cn(
                cm.flex({ direction: 'col', align: 'center' }),
                'relative z-10 text-center',
              )}
            >
              <p
                className={cm.cn(
                  cm.textSize('2xl'),
                  cm.fontWeight('medium'),
                  'text-on-surface leading-tight',
                  cm.sp('mb', 8),
                )}
              >
                {t(
                  'landing.testimonial.quote',
                  { app: APP_NAME },
                  {
                    defaultValue:
                      "Meridian didn't just organize my calendar; it gave me back hours of my week.",
                  },
                )}
              </p>
              <div className={cm.flex({ align: 'center', gap: 'md' })}>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'w-12 h-12 rounded-full bg-primary-light text-primary font-bold',
                  )}
                >
                  MC
                </div>
                <div className={cm.cn('text-left')}>
                  <div className={cm.cn(cm.fontWeight('bold'))}>
                    {t('landing.testimonial.name', {}, { defaultValue: 'Marcus Chen' })}
                  </div>
                  <div className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                    {t(
                      'landing.testimonial.role',
                      {},
                      { defaultValue: 'VP of Engineering, Acme Corp' },
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={cm.cn('border-t border-outline-variant/40')}>
          <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-16 text-center')}>
            <h3
              className={cm.cn(cm.textSize('3xl'), cm.sp('mb', 4), 'font-extrabold tracking-tight')}
            >
              {t(
                'landing.ctaHeading',
                {},
                { defaultValue: 'Stop chasing replies. Start sending links.' },
              )}
            </h3>
            <p
              className={cm.cn(
                cm.textSize('base'),
                cm.sp('mb', 8),
                'text-on-surface-variant max-w-xl mx-auto',
              )}
            >
              {t(
                'landing.ctaBody',
                {},
                {
                  defaultValue:
                    'Free to start, polished from day one. Pro adds unlimited booking links and custom branding; Team adds round-robin and shared availability.',
                },
              )}
            </p>
            <Link
              to="/signup"
              data-mol-id="landing-cta-signup"
              className={cm.cn(
                cm.sp('px', 10),
                cm.sp('py', 4),
                cm.fontWeight('semibold'),
                'rounded-xl shadow-xl shadow-primary/20 inline-flex items-center gap-2',
                GRADIENT_CTA,
              )}
            >
              {t('landing.heroCta', {}, { defaultValue: 'Create your booking link' })}
              <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          </div>
        </section>
      </main>

      <footer className={cm.cn('bg-surface-container-low mt-8')}>
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.mxAuto,
            cm.sp('px', 6),
            cm.sp('py', 12),
            'grid grid-cols-1 md:grid-cols-4 gap-12',
          )}
        >
          <div className={cm.cn('md:col-span-2')}>
            <div className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), cm.sp('mb', 3))}>
              <BrandWordmark footer as="span" size="sm" />
            </div>
            <p
              className={cm.cn(
                cm.textSize('sm'),
                'text-on-surface-variant max-w-sm font-light',
                cm.sp('mb', 4),
              )}
            >
              {APP_TAGLINE}.{' '}
              {t(
                'landing.footer.mission',
                {},
                { defaultValue: 'Designed for professionals whose lives are measured in minutes.' },
              )}
            </p>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t(
                'common.copyrightBuiltWithMolecule',
                { year, app: APP_NAME },
                { defaultValue: '© {{year}} {{app}}' },
              )}
              {' — Built with '}
              <a
                href="https://molecule.dev"
                target="_blank"
                rel="noopener noreferrer"
                className={cm.cn('hover:underline font-medium')}
              >
                Molecule.dev
              </a>
            </p>
          </div>
          <div>
            <h4 className={cm.cn(cm.fontWeight('semibold'), cm.sp('mb', 3))}>
              {t('landing.footer.productHeading', {}, { defaultValue: 'Product' })}
            </h4>
            <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), cm.textSize('sm'))}>
              <li>
                <a
                  href="#features"
                  className={cm.cn(
                    'text-on-surface-variant hover:text-primary hover:underline underline-offset-4 transition-colors',
                  )}
                >
                  {t('nav.features', {}, { defaultValue: 'Features' })}
                </a>
              </li>
              <li>
                <Link
                  to="/pricing"
                  className={cm.cn(
                    'text-on-surface-variant hover:text-primary hover:underline underline-offset-4 transition-colors',
                  )}
                >
                  {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
                </Link>
              </li>
              <li>
                <Link
                  to="/about"
                  className={cm.cn(
                    'text-on-surface-variant hover:text-primary hover:underline underline-offset-4 transition-colors',
                  )}
                >
                  {t('footer.about', { appName: APP_NAME }, { defaultValue: 'About' })}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className={cm.cn(cm.fontWeight('semibold'), cm.sp('mb', 3))}>
              {t('landing.footer.legalHeading', {}, { defaultValue: 'Legal' })}
            </h4>
            <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), cm.textSize('sm'))}>
              <li>
                <Link
                  to="/privacy"
                  className={cm.cn(
                    'text-on-surface-variant hover:text-primary hover:underline underline-offset-4 transition-colors',
                  )}
                >
                  {t('nav.privacy', {}, { defaultValue: 'Privacy' })}
                </Link>
              </li>
              <li>
                <Link
                  to="/terms"
                  className={cm.cn(
                    'text-on-surface-variant hover:text-primary hover:underline underline-offset-4 transition-colors',
                  )}
                >
                  {t('nav.terms', {}, { defaultValue: 'Terms' })}
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Landing
