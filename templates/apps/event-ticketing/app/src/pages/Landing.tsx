import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { EventCard, type EventSummary } from '../components/EventCard.js'
import { HeroEventCard } from '../components/HeroEventCard.js'

const FEATURES = [
  {
    key: 'discover',
    defaultTitle: 'Discover the night',
    defaultBody:
      'Hand-picked concerts, festivals, and conferences updated by curators in your city.',
    icon: 'explore',
    tint: 'text-primary',
  },
  {
    key: 'instant',
    defaultTitle: 'Instant QR tickets',
    defaultBody:
      'Tap, scan, and you’re in. Apple/Google Wallet, transfer to friends, and printable PDFs.',
    icon: 'qr_code_2',
    tint: 'text-tertiary',
  },
  {
    key: 'safe',
    defaultTitle: 'Buyer protection',
    defaultBody:
      'Every purchase is escrowed. If the event is cancelled, refunds happen automatically.',
    icon: 'verified_user',
    tint: 'text-success',
  },
  {
    key: 'host',
    defaultTitle: 'Host your own event',
    defaultBody:
      'Set tier pricing, accept payments, run check-in — all from your phone in 60 seconds.',
    icon: 'celebration',
    tint: 'text-secondary',
  },
] as const

interface EventRow {
  id: string
  title: string
  category: string
  start_date: string
  start_time?: string | null
  venue?: string | null
  city?: string | null
  min_price?: number | null
  status?: string | null
  tickets_total?: number | null
  tickets_sold?: number | null
}

function rowToSummary(row: EventRow): EventSummary {
  const isFree = (row.min_price ?? 0) === 0
  const sold = Number(row.tickets_sold ?? 0)
  const total = Number(row.tickets_total ?? 0)
  const isSoldOut = total > 0 && sold >= total
  return {
    id: row.id,
    title: row.title,
    category: row.category ?? 'Event',
    start_date: row.start_date,
    start_time: row.start_time ?? undefined,
    venue_name: row.venue ?? '',
    city: row.city ?? '',
    min_price: isFree ? undefined : Math.round(Number(row.min_price ?? 0) * 100),
    is_free: isFree,
    is_sold_out: isSoldOut || undefined,
  }
}

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const isAuthenticated = useIsAuthenticated()
  const [previews, setPreviews] = useState<EventSummary[] | null>(null)
  const [hero, setHero] = useState<EventSummary | null>(null)

  useEffect(() => {
    let cancelled = false
    http
      .get('/api/events?limit=4')
      .then((res) => {
        if (cancelled) return
        const rows = (res.data as EventRow[]) ?? []
        const list = rows.map(rowToSummary)
        setPreviews(list)
        setHero(list[0] ?? null)
      })
      .catch(() => {
        if (!cancelled) {
          setPreviews([])
          setHero(null)
        }
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
          <Link
            to="/"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.textSize('xl'),
              'font-extrabold tracking-tighter',
            )}
          >
            <span
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                'w-9 h-9 rounded-xl text-white shadow-md shadow-primary/30',
              )}
              style={{
                background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
              }}
            >
              <span
                className={cm.cn('material-symbols-outlined text-lg')}
                style={{ fontVariationSettings: "'FILL' 1" }}
                aria-hidden="true"
              >
                confirmation_number
              </span>
            </span>
            <span style={{ color: 'var(--color-primary)' }}>{APP_NAME}</span>
          </Link>
          <div className={cm.flex({ align: 'center', gap: 'md' })}>
            <Link
              to="/events"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'hidden md:inline text-on-surface-variant hover:text-on-surface',
              )}
            >
              {t('nav.discover', {}, { defaultValue: 'Discover' })}
            </Link>
            <Link
              to="/events/new"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'hidden md:inline text-on-surface-variant hover:text-on-surface',
              )}
            >
              {t('landing.nav.host', {}, { defaultValue: 'Host an event' })}
            </Link>
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                data-mol-id="nav-dashboard"
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.fontWeight('semibold'),
                  'rounded-full text-white shadow-md shadow-primary/30 hover:-translate-y-0.5 transition-transform',
                )}
                style={{
                  background:
                    'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                }}
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
                  data-mol-id="nav-signup"
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 2),
                    cm.fontWeight('semibold'),
                    'rounded-full text-white shadow-md shadow-primary/30 hover:-translate-y-0.5 transition-transform',
                  )}
                  style={{
                    background:
                      'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                  }}
                >
                  {t('common.getStarted', {}, { defaultValue: 'Get started' })}
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main>
        {/* Hero */}
        <section className={cm.cn('relative overflow-hidden')}>
          <div
            className={cm.cn('absolute inset-0 pointer-events-none')}
            aria-hidden="true"
            style={{
              background:
                'linear-gradient(135deg, var(--color-background-tertiary) 0%, var(--color-background) 50%, var(--color-surface) 100%)',
            }}
          />
          <div
            className={cm.cn(
              'absolute -right-24 top-12 w-96 h-96 rounded-full opacity-40 blur-3xl',
            )}
            style={{ background: 'var(--color-primary)' }}
            aria-hidden="true"
          />
          <div
            className={cm.cn(
              'absolute left-12 bottom-0 w-72 h-72 rounded-full opacity-30 blur-3xl',
            )}
            style={{ background: 'var(--color-accent)' }}
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
                    background: 'var(--color-error-light)',
                    color: 'var(--color-accent-dark)',
                  }}
                >
                  <span
                    className={cm.cn('w-2 h-2 rounded-full animate-pulse')}
                    style={{ background: 'var(--color-accent)' }}
                    aria-hidden="true"
                  />
                  {t('landing.eyebrow', {}, { defaultValue: 'Tickets that travel with you' })}
                </div>
                <h1
                  className={cm.cn(
                    cm.sp('mb', 6),
                    'text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[0.95]',
                  )}
                >
                  {t('landing.heroTitle', {}, { defaultValue: 'Every moment,' })}
                  <span className={cm.cn('block')} style={{ color: 'var(--color-primary)' }}>
                    {t('landing.heroTitleAccent', {}, { defaultValue: 'front row.' })}
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
                        'Concerts, festivals, conferences — discover what’s on near you, lock in tickets in two taps, and walk in with a single QR pass.',
                    },
                  )}
                </p>
                <div className={cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' })}>
                  <Link
                    to="/signup"
                    data-mol-id="hero-signup"
                    className={cm.cn(
                      cm.sp('px', 8),
                      cm.sp('py', 4),
                      'font-semibold rounded-full text-white inline-flex items-center gap-2 shadow-lg shadow-primary/30 hover:-translate-y-0.5 transition-transform',
                    )}
                    style={{
                      background:
                        'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                    }}
                  >
                    {t('common.getStarted', {}, { defaultValue: 'Get started' })}
                    <span
                      className={cm.cn('material-symbols-outlined text-base')}
                      aria-hidden="true"
                    >
                      arrow_forward
                    </span>
                  </Link>
                  <Link
                    to="/events"
                    data-mol-id="hero-browse"
                    className={cm.cn(
                      cm.sp('px', 8),
                      cm.sp('py', 4),
                      cm.fontWeight('semibold'),
                      'rounded-full border border-outline-variant hover:bg-surface-container-low transition-colors inline-flex items-center gap-2',
                    )}
                  >
                    <span
                      className={cm.cn('material-symbols-outlined text-base')}
                      aria-hidden="true"
                    >
                      explore
                    </span>
                    {t('landing.browseCta', {}, { defaultValue: 'Browse events' })}
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
                      QR
                    </p>
                    <p className={cm.cn(cm.textSize('xs'), cm.textMuted)}>
                      {t('landing.statQr', {}, { defaultValue: 'One-tap entry' })}
                    </p>
                  </div>
                  <div className={cm.cn('w-px h-10 bg-outline-variant')} />
                  <div>
                    <p className={cm.cn('text-2xl font-extrabold tabular-nums tracking-tight')}>
                      $0
                    </p>
                    <p className={cm.cn(cm.textSize('xs'), cm.textMuted)}>
                      {t('landing.statSetup', {}, { defaultValue: 'To list your event' })}
                    </p>
                  </div>
                  <div className={cm.cn('w-px h-10 bg-outline-variant')} />
                  <div>
                    <p className={cm.cn('text-2xl font-extrabold tabular-nums tracking-tight')}>
                      24h
                    </p>
                    <p className={cm.cn(cm.textSize('xs'), cm.textMuted)}>
                      {t('landing.statPayout', {}, { defaultValue: 'Avg payout time' })}
                    </p>
                  </div>
                </div>
              </div>

              <div className={cm.cn('lg:col-span-5 relative z-10 flex justify-end')}>
                {hero ? (
                  <HeroEventCard
                    id={hero.id}
                    category={hero.category || 'Event'}
                    title={hero.title}
                    imageAlt={hero.title}
                    startDateIso={hero.start_date}
                    startTime={hero.start_time}
                    venueName={hero.venue_name || ''}
                    city={hero.city || ''}
                    fromPriceCents={hero.min_price}
                    isFree={hero.is_free}
                    ribbonLabel={
                      hero.is_sold_out
                        ? t('landing.ribbonSoldOut', {}, { defaultValue: 'Sold out' })
                        : t('landing.ribbonOnSale', {}, { defaultValue: 'On sale' })
                    }
                  />
                ) : (
                  <div
                    className={cm.cn(
                      'relative w-full max-w-lg p-10 rounded-[2rem] text-white text-center shadow-2xl shadow-primary/30',
                    )}
                    style={{
                      background:
                        'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                    }}
                    data-mol-id="hero-empty"
                  >
                    <span
                      className={cm.cn('material-symbols-outlined block mx-auto')}
                      style={{ fontSize: '6rem', fontVariationSettings: "'FILL' 1" }}
                      aria-hidden="true"
                    >
                      celebration
                    </span>
                    <h3 className={cm.cn('text-2xl font-extrabold tracking-tight mt-3')}>
                      {t('landing.heroEmptyHeading', {}, { defaultValue: 'Be the first to host' })}
                    </h3>
                    <p className={cm.cn('opacity-80 mt-2 leading-relaxed')}>
                      {t(
                        'landing.heroEmptyBody',
                        {},
                        {
                          defaultValue:
                            'No events are on sale yet. Sell your first ticket in 60 seconds — free to start.',
                        },
                      )}
                    </p>
                    <Link
                      to="/events/new"
                      className={cm.cn(
                        'inline-flex items-center gap-2 px-6 py-3 mt-6 rounded-full font-bold',
                      )}
                      style={{ background: 'var(--color-accent)' }}
                    >
                      {t('landing.heroEmptyCta', {}, { defaultValue: 'Host an event' })}
                      <span
                        className={cm.cn('material-symbols-outlined text-base')}
                        aria-hidden="true"
                      >
                        arrow_forward
                      </span>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* On-sale strip */}
        {previews && previews.length > 0 ? (
          <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-16')}>
            <div
              className={cm.cn(
                cm.flex({ align: 'end', justify: 'between' }),
                cm.sp('mb', 6),
                'flex-wrap gap-4',
              )}
            >
              <div>
                <p
                  className={cm.cn(
                    'text-xs font-black uppercase tracking-widest text-primary mb-2',
                  )}
                >
                  {t('landing.onSaleEyebrow', {}, { defaultValue: 'Latest events' })}
                </p>
                <h2 className={cm.cn('text-3xl font-extrabold tracking-tight')}>
                  {t('landing.onSaleHeading', {}, { defaultValue: 'On sale right now' })}
                </h2>
              </div>
              <Link
                to="/events"
                className={cm.cn(cm.textSize('sm'), 'font-bold text-primary hover:underline')}
              >
                {t('landing.viewAll', {}, { defaultValue: 'See every event →' })}
              </Link>
            </div>
            <div
              className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4')}
            >
              {previews.map((evt) => (
                <EventCard key={evt.id} event={evt} />
              ))}
            </div>
          </section>
        ) : null}

        {/* Features */}
        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-20')}>
          <div className={cm.cn(cm.textCenter, cm.sp('mb', 12))}>
            <p className={cm.cn('text-xs font-black uppercase tracking-widest text-primary mb-3')}>
              {t(
                'landing.featuresEyebrow',
                { app: APP_NAME },
                { defaultValue: 'Why hosts and fans love {{app}}' },
              )}
            </p>
            <h2 className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight')}>
              {t('landing.featuresHeading', {}, { defaultValue: APP_TAGLINE })}
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

        {/* Organizer CTA */}
        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-16')}>
          <div
            className={cm.cn('relative overflow-hidden rounded-3xl shadow-2xl text-white')}
            style={{
              background:
                'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-mid) 50%, var(--color-secondary) 100%)',
            }}
          >
            <div
              className={cm.cn(
                'absolute -right-20 -bottom-20 w-72 h-72 rounded-full bg-surface/10 blur-3xl',
              )}
              aria-hidden="true"
            />
            <div
              className={cm.cn(
                'absolute -left-12 top-0 w-48 h-48 rounded-full opacity-30 blur-3xl',
              )}
              style={{ background: 'var(--color-accent)' }}
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
                  {t('landing.organizerEyebrow', {}, { defaultValue: 'For organizers' })}
                </p>
                <h2 className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight mb-4')}>
                  {t(
                    'landing.organizerHeading',
                    {},
                    { defaultValue: 'Sell your first ticket in 60 seconds.' },
                  )}
                </h2>
                <p className={cm.cn('text-base text-white/80 max-w-md leading-relaxed mb-6')}>
                  {t(
                    'landing.organizerBody',
                    {},
                    {
                      defaultValue:
                        'Multi-tier pricing, instant payouts, attendee check-in from your phone. Free to start, fees only when you sell.',
                    },
                  )}
                </p>
                <Link
                  to="/events/new"
                  data-mol-id="organizer-cta"
                  className={cm.cn(
                    cm.sp('px', 8),
                    cm.sp('py', 4),
                    'rounded-full inline-flex items-center gap-2 font-bold transition-transform hover:-translate-y-0.5',
                  )}
                  style={{ background: 'var(--color-accent)', color: 'white' }}
                >
                  {t('landing.organizerCta', {}, { defaultValue: 'Host an event' })}
                  <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                    arrow_forward
                  </span>
                </Link>
              </div>
              <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-2')}>
                <div className={cm.cn('rounded-xl bg-surface/10 backdrop-blur-sm p-5')}>
                  <p className={cm.cn('text-3xl font-extrabold tabular-nums tracking-tight')}>$0</p>
                  <p
                    className={cm.cn('text-xs font-bold uppercase tracking-widest opacity-70 mt-1')}
                  >
                    {t('landing.organizerStatStart', {}, { defaultValue: 'Free to start' })}
                  </p>
                </div>
                <div className={cm.cn('rounded-xl bg-surface/10 backdrop-blur-sm p-5')}>
                  <p className={cm.cn('text-3xl font-extrabold tabular-nums tracking-tight')}>
                    24h
                  </p>
                  <p
                    className={cm.cn('text-xs font-bold uppercase tracking-widest opacity-70 mt-1')}
                  >
                    {t('landing.organizerStatPayout', {}, { defaultValue: 'Avg payout time' })}
                  </p>
                </div>
                <div className={cm.cn('rounded-xl bg-surface/10 backdrop-blur-sm p-5')}>
                  <p className={cm.cn('text-3xl font-extrabold tabular-nums tracking-tight')}>QR</p>
                  <p
                    className={cm.cn('text-xs font-bold uppercase tracking-widest opacity-70 mt-1')}
                  >
                    {t('landing.organizerStatQr', {}, { defaultValue: 'Built-in scanner' })}
                  </p>
                </div>
                <div className={cm.cn('rounded-xl bg-surface/10 backdrop-blur-sm p-5')}>
                  <p className={cm.cn('text-3xl font-extrabold tabular-nums tracking-tight')}>
                    3 min
                  </p>
                  <p
                    className={cm.cn('text-xs font-bold uppercase tracking-widest opacity-70 mt-1')}
                  >
                    {t('landing.organizerStatSetup', {}, { defaultValue: 'To set up an event' })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className={cm.cn('border-t border-outline-variant/40')}>
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.mxAuto,
            cm.sp('px', 6),
            'py-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-sm',
          )}
        >
          <div className={cm.cn('col-span-2 md:col-span-1')}>
            <p
              className={cm.cn('text-xl font-extrabold tracking-tighter')}
              style={{ color: 'var(--color-primary)' }}
            >
              {APP_NAME}
            </p>
            <p className={cm.cn('mt-3 text-on-surface-variant leading-relaxed')}>
              {t(
                'landing.footerTagline',
                {},
                {
                  defaultValue:
                    'The friendliest way to discover concerts, festivals, and conferences — and host your own when you’re ready.',
                },
              )}
            </p>
          </div>
          <div>
            <p className={cm.cn('font-bold text-on-surface mb-3')}>
              {t('landing.footerAttendHeading', {}, { defaultValue: 'Attend' })}
            </p>
            <ul className={cm.cn('space-y-2 text-on-surface-variant')}>
              <li>
                <Link to="/events">
                  {t('landing.footerBrowse', {}, { defaultValue: 'Browse events' })}
                </Link>
              </li>
              <li>
                <Link to="/my-tickets">
                  {t('landing.footerMyTickets', {}, { defaultValue: 'My tickets' })}
                </Link>
              </li>
              <li>
                <Link to="/notifications">
                  {t('nav.activity', {}, { defaultValue: 'Activity' })}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className={cm.cn('font-bold text-on-surface mb-3')}>
              {t('landing.footerOrganizeHeading', {}, { defaultValue: 'Organize' })}
            </p>
            <ul className={cm.cn('space-y-2 text-on-surface-variant')}>
              <li>
                <Link to="/events/new">
                  {t('landing.footerCreate', {}, { defaultValue: 'Host an event' })}
                </Link>
              </li>
              <li>
                <Link to="/dashboard">
                  {t('landing.footerDashboard', {}, { defaultValue: 'Organizer dashboard' })}
                </Link>
              </li>
              <li>
                <Link to="/settings">
                  {t('landing.footerSettings', {}, { defaultValue: 'Account settings' })}
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
                <Link to="/about">{t('nav.about', {}, { defaultValue: 'About' })}</Link>
              </li>
              <li>
                <Link to="/terms">{t('nav.terms', {}, { defaultValue: 'Terms' })}</Link>
              </li>
              <li>
                <Link to="/privacy">{t('nav.privacy', {}, { defaultValue: 'Privacy' })}</Link>
              </li>
              <li>
                <Link to="/login">
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </Link>
              </li>
              <li>
                <Link to="/signup">
                  {t('auth.signup.createAccount', {}, { defaultValue: 'Create account' })}
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
