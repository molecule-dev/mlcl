import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'

const FEATURES = [
  {
    key: 'availability',
    defaultTitle: 'Availability that respects you',
    defaultBody: 'Set weekly hours, buffers, and timezone-aware overrides — {{app}} does the math.',
    icon: 'schedule',
    tint: 'text-primary',
  },
  {
    key: 'booking',
    defaultTitle: 'Polished booking links',
    defaultBody: 'Share /your-name/30min and let invitees pick a slot from a calm, branded page.',
    icon: 'link',
    tint: 'text-secondary',
  },
  {
    key: 'sync',
    defaultTitle: 'Two-way calendar sync',
    defaultBody:
      'Connect Google, Outlook, and Apple Calendar — {{app}} writes both ways and avoids conflicts.',
    icon: 'sync_alt',
    tint: 'text-tertiary',
  },
  {
    key: 'reminders',
    defaultTitle: 'Considerate reminders',
    defaultBody:
      'Email and push reminders for both sides, plus reschedule links that respect time zones.',
    icon: 'notifications_active',
    tint: 'text-info',
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

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
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
          <Link to="/" className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
            <span
              className={cm.cn(
                cm.w(8),
                cm.h(8),
                cm.roundedFull,
                cm.flex({ align: 'center', justify: 'center' }),
                'shadow-sm shadow-primary/30',
              )}
              style={{
                background:
                  'linear-gradient(135deg, var(--color-primary), var(--color-primary-gradient-to))',
              }}
              aria-hidden="true"
            >
              <span
                className={cm.cn(cm.textSize('base'), 'material-symbols-outlined text-white')}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                schedule
              </span>
            </span>
            <span className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight')}>
              {APP_NAME}
            </span>
          </Link>
          <div className={cm.flex({ align: 'center', gap: 'md' })}>
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.fontWeight('semibold'),
                  'bg-primary text-on-primary rounded-full hover:bg-primary/90 transition-colors',
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
                    'bg-primary text-on-primary rounded-full hover:bg-primary/90 transition-colors',
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
        <section className={cm.cn('relative overflow-hidden')}>
          <div
            className={cm.cn(
              'absolute inset-0 bg-gradient-to-br from-primary-container via-surface to-surface',
              'pointer-events-none',
            )}
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
              <div className={'lg:col-span-7'}>
                <p
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.sp('mb', 4),
                    'font-bold uppercase tracking-widest text-primary',
                  )}
                >
                  {t('landing.eyebrow', {}, { defaultValue: 'Scheduling for professionals' })}
                </p>
                <h1
                  className={cm.cn(
                    cm.sp('mb', 6),
                    'text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[0.95]',
                  )}
                >
                  {t(
                    'landing.heroTitle',
                    { tagline: APP_TAGLINE },
                    { defaultValue: '{{tagline}}.' },
                  )}
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
                    className={cm.cn(
                      cm.sp('px', 8),
                      cm.sp('py', 4),
                      'font-semibold bg-primary text-on-primary rounded-full hover:bg-primary/90 transition-colors inline-flex items-center gap-2',
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
                      cm.fontWeight('semibold'),
                      'rounded-full border border-outline-variant hover:bg-surface-container-low transition-colors',
                    )}
                  >
                    {t('landing.pricingCta', {}, { defaultValue: 'See pricing' })}
                  </Link>
                </div>
                <p
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.sp('mt', 6),
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

              {/* Sample hero card mirroring the auth'd Dashboard's TodayHeroCard */}
              <div className={'lg:col-span-5'}>
                <div
                  className={cm.cn(
                    cm.flex({ direction: 'col', justify: 'between' }),
                    cm.sp('p', 8),
                    'min-h-[280px] bg-gradient-to-br from-primary to-primary-container rounded-[2rem] text-white relative overflow-hidden shadow-2xl shadow-primary/20',
                  )}
                >
                  <div className="relative z-10">
                    <p
                      className={
                        'font-bold text-xs uppercase tracking-widest text-primary-fixed/80 mb-2'
                      }
                    >
                      {t('landing.sampleCardLabel', {}, { defaultValue: "Today's schedule" })}
                    </p>
                    <div className={cm.flex({ align: 'baseline', gap: 'sm' })}>
                      <span className="text-5xl font-extrabold tracking-tighter tabular-nums">
                        7
                      </span>
                      <span
                        className={cm.cn(cm.textSize('sm'), 'font-semibold text-primary-fixed/90')}
                      >
                        {t('landing.sampleCardWeek', {}, { defaultValue: '24 this week' })}
                      </span>
                    </div>
                    <span
                      className={
                        'px-3 py-1 rounded-full text-[11px] font-bold bg-surface/20 backdrop-blur-md inline-flex items-center gap-1 mt-5'
                      }
                    >
                      <span className={'material-symbols-outlined text-sm'} aria-hidden="true">
                        event_upcoming
                      </span>
                      {t('landing.sampleCardNext', {}, { defaultValue: 'Next: Avery Liu in 28m' })}
                    </span>
                  </div>
                  <div className={'relative z-10 mt-8 h-20'}>
                    <svg
                      className={'w-full h-full'}
                      viewBox="0 0 400 100"
                      preserveAspectRatio="none"
                    >
                      <path
                        d="M0,80 Q50,50 100,55 T200,30 T300,40 T400,15 L400,100 L0,100 Z"
                        fill="white"
                        opacity="0.3"
                      />
                      <path
                        d="M0,80 Q50,50 100,55 T200,30 T300,40 T400,15"
                        fill="none"
                        stroke="white"
                        strokeWidth="3"
                      />
                    </svg>
                  </div>
                  <div
                    className={
                      'absolute -right-16 -bottom-16 w-64 h-64 rounded-full bg-surface/10 blur-3xl'
                    }
                  />
                  <div
                    className={
                      'absolute right-8 top-8 w-16 h-16 rounded-full bg-primary-fixed/20 blur-xl'
                    }
                  />
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
                      'rounded-full bg-primary text-on-primary font-semibold text-center hover:opacity-90 transition-opacity',
                    )}
                  >
                    {t('landing.bookNow', {}, { defaultValue: 'Book now' })}
                  </Link>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-20')}>
          <h2
            className={cm.cn(
              cm.sp('mb', 12),
              cm.textCenter,
              'text-3xl md:text-4xl font-extrabold tracking-tight',
            )}
          >
            {t(
              'landing.featuresHeading',
              {},
              { defaultValue: 'Meetings that schedule themselves' },
            )}
          </h2>
          <div
            className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4')}
          >
            {FEATURES.map((f) => (
              <div
                key={f.key}
                className={cm.cn(
                  cm.sp('p', 6),
                  'bg-surface-container-lowest rounded-2xl hover:shadow-2xl hover:shadow-on-surface/5 transition-all group',
                )}
              >
                <div
                  className={cm.cn(
                    cm.sp('p', 3),
                    'inline-flex bg-surface rounded-xl shadow-sm group-hover:scale-110 transition-transform',
                    f.tint,
                  )}
                >
                  <span className="material-symbols-outlined text-3xl" aria-hidden="true">
                    {f.icon}
                  </span>
                </div>
                <h3
                  className={cm.cn(cm.textSize('lg'), cm.sp('mt', 5), cm.sp('mb', 2), 'font-bold')}
                >
                  {t(`landing.feature.${f.key}.title`, {}, { defaultValue: f.defaultTitle })}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
                  {t(
                    `landing.feature.${f.key}.body`,
                    { app: APP_NAME },
                    { defaultValue: f.defaultBody },
                  )}
                </p>
              </div>
            ))}
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
              className={cm.cn(
                cm.sp('px', 10),
                cm.sp('py', 4),
                'font-semibold bg-primary text-on-primary rounded-full hover:bg-primary/90 transition-colors inline-flex items-center gap-2',
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

      <footer
        className={cm.cn(
          cm.sp('py', 8),
          cm.textCenter,
          cm.textSize('sm'),
          'bg-surface text-on-surface-variant border-t border-outline-variant',
        )}
      >
        <p>
          {t(
            'landing.copyright',
            { year, app: APP_NAME },
            { defaultValue: '© {{year}} {{app}}. Where schedules align.' },
          )}
        </p>
      </footer>
    </div>
  )
}

export default Landing
