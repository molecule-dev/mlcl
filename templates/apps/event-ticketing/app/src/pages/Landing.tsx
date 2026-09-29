import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { BrandWordmark } from '../components/BrandWordmark.js'
import { EventCard, type EventSummary } from '../components/EventCard.js'

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

  useEffect(() => {
    let cancelled = false
    http
      .get('/api/events?limit=4')
      .then((res) => {
        if (cancelled) return
        const rows = (res.data as EventRow[]) ?? []
        setPreviews(rows.map(rowToSummary))
      })
      .catch(() => {
        if (!cancelled) setPreviews([])
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
            <BrandWordmark as="span" />
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
                  cm.sp('px', 6),
                  cm.sp('py', 2),
                  cm.fontWeight('semibold'),
                  'rounded-xl text-white shadow-sm hover:opacity-90 transition-opacity',
                )}
                style={{ background: 'var(--color-primary)' }}
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
                    'text-on-surface-variant hover:text-primary transition-colors',
                  )}
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </Link>
                <Link
                  to="/signup"
                  data-mol-id="nav-signup"
                  className={cm.cn(
                    cm.sp('px', 6),
                    cm.sp('py', 2),
                    cm.fontWeight('semibold'),
                    'rounded-xl text-white shadow-sm hover:opacity-90 transition-opacity',
                  )}
                  style={{ background: 'var(--color-primary)' }}
                >
                  {t('common.getStarted', {}, { defaultValue: 'Get started' })}
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main>
        {/* Hero — full-bleed violet→indigo gradient banner, centered */}
        <section
          className={cm.cn('relative overflow-hidden')}
          style={{
            background:
              'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)',
          }}
        >
          {/* soft light blooms standing in for the design's crowd-photo overlay */}
          <div
            className={cm.cn('absolute inset-0 mix-blend-overlay opacity-30 pointer-events-none')}
            aria-hidden="true"
            style={{
              background:
                'radial-gradient(circle at 20% 30%, rgba(255,255,255,0.7) 0%, transparent 40%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.4) 0%, transparent 45%)',
            }}
          />
          <div
            className={cm.cn(
              cm.maxW('4xl'),
              cm.mxAuto,
              cm.sp('px', 6),
              'pt-20 pb-24 md:pt-28 md:pb-32 relative text-center',
            )}
          >
            <div
              className={cm.cn(
                'inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-6',
              )}
              style={{ background: 'rgba(255,255,255,0.14)', color: 'white' }}
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
                'text-5xl md:text-7xl font-black tracking-tight leading-[1.02] text-white',
              )}
            >
              {t('landing.heroTitle', {}, { defaultValue: 'Every moment,' })}{' '}
              {t('landing.heroTitleAccent', {}, { defaultValue: 'front row.' })}
            </h1>
            <p
              className={cm.cn(
                cm.textSize('lg'),
                'md:text-xl text-white/85 font-medium max-w-2xl mx-auto leading-relaxed',
                cm.sp('mb', 10),
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
            <div
              className={cm.flex({ align: 'center', justify: 'center', gap: 'md', wrap: 'wrap' })}
            >
              <Link
                to="/signup"
                data-mol-id="hero-signup"
                className={cm.cn(
                  cm.sp('px', 8),
                  cm.sp('py', 4),
                  'font-semibold rounded-xl text-on-surface inline-flex items-center gap-2 shadow-lg hover:opacity-95 transition-opacity',
                )}
                style={{ background: 'var(--color-surface)' }}
              >
                {t('common.getStarted', {}, { defaultValue: 'Get started' })}
                <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
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
                  'rounded-xl inline-flex items-center gap-2 text-white transition-colors',
                )}
                style={{ background: 'rgba(255,255,255,0.12)' }}
              >
                <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                  explore
                </span>
                {t('landing.browseCta', {}, { defaultValue: 'Browse events' })}
              </Link>
            </div>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center', gap: 'lg' }),
                cm.sp('mt', 10),
                cm.sp('pt', 6),
                'flex-wrap',
              )}
            >
              {[
                { key: 'statQr', big: 'QR', small: 'One-tap entry' },
                { key: 'statSetup', big: '$0', small: 'To list your event' },
                { key: 'statPayout', big: '24h', small: 'Avg payout time' },
              ].map((s, i) => (
                <div
                  key={s.key}
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'lg' }),
                    i > 0 && 'pl-6 border-l border-white/25',
                  )}
                >
                  <div>
                    <p
                      className={cm.cn(
                        'text-2xl font-extrabold tabular-nums tracking-tight text-white',
                      )}
                    >
                      {s.big}
                    </p>
                    <p className={cm.cn(cm.textSize('xs'), 'text-white/70')}>
                      {t(`landing.${s.key}`, {}, { defaultValue: s.small })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Floating search bar — overlaps the hero edge */}
        <div
          className={cm.cn(cm.maxW('5xl'), cm.mxAuto, cm.sp('px', 6), 'relative z-20')}
          style={{ marginTop: '-28px' }}
        >
          <div
            className={cm.cn(
              'bg-surface rounded-xl shadow-xl border border-outline-variant/40 flex flex-col md:flex-row items-center p-2 gap-2',
            )}
          >
            {[
              { key: 'what', label: 'What?', hint: 'Search events, artists' },
              { key: 'where', label: 'Where?', hint: 'Any location' },
              { key: 'when', label: 'When?', hint: 'Any date' },
              { key: 'guests', label: 'Guests', hint: '2 people' },
            ].map((f, i) => (
              <div key={f.key} className={cm.cn(cm.flex({ align: 'center' }), 'w-full')}>
                {i > 0 ? (
                  <div className={cm.cn('hidden md:block w-px h-8 bg-outline-variant mx-2')} />
                ) : null}
                <div
                  className={cm.cn(
                    cm.flex({ direction: 'col', justify: 'center' }),
                    'flex-1 w-full px-4 py-1.5 hover:bg-surface-container-low rounded-lg transition-colors',
                  )}
                >
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      'uppercase tracking-wide text-on-surface',
                    )}
                  >
                    {t(`landing.search.${f.key}.label`, {}, { defaultValue: f.label })}
                  </span>
                  <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant truncate')}>
                    {t(`landing.search.${f.key}.hint`, {}, { defaultValue: f.hint })}
                  </span>
                </div>
              </div>
            ))}
            <Link
              to="/events"
              data-mol-id="hero-search"
              className={cm.cn(
                cm.sp('px', 6),
                cm.sp('py', 3),
                'rounded-xl font-bold inline-flex items-center justify-center gap-2 text-white shadow-md transition-opacity hover:opacity-90 w-full md:w-auto',
              )}
              style={{ background: 'var(--color-accent)' }}
            >
              <span
                className={cm.cn('material-symbols-outlined text-xl')}
                style={{ fontVariationSettings: "'FILL' 1" }}
                aria-hidden="true"
              >
                search
              </span>
              <span className={cm.cn('hidden lg:inline')}>
                {t('landing.search.cta', {}, { defaultValue: 'Search events' })}
              </span>
            </Link>
          </div>
        </div>

        {/* Category pills */}
        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'pt-14')}>
          <div className={cm.cn(cm.flex({ wrap: 'wrap', justify: 'center', gap: 'sm' }))}>
            {[
              { icon: 'music_note', key: 'music', label: 'Music', active: true },
              { icon: 'sports_basketball', key: 'sports', label: 'Sports', active: false },
              { icon: 'festival', key: 'festivals', label: 'Festivals', active: false },
              { icon: 'theater_comedy', key: 'theater', label: 'Theater', active: false },
              { icon: 'campaign', key: 'conferences', label: 'Conferences', active: false },
              { icon: 'mic', key: 'comedy', label: 'Comedy', active: false },
            ].map((c) => (
              <Link
                key={c.key}
                to="/events"
                data-mol-id={`category-${c.key}`}
                className={cm.cn(
                  cm.sp('px', 6),
                  cm.sp('py', 3),
                  cm.flex({ align: 'center', gap: 'xs' }),
                  'rounded-full text-sm font-semibold transition-colors',
                  c.active
                    ? 'text-white shadow-sm'
                    : 'bg-surface-container-low text-on-surface border border-outline-variant/60 hover:text-primary hover:border-primary',
                )}
                style={c.active ? { background: 'var(--color-primary)' } : undefined}
              >
                <span className={cm.cn('material-symbols-outlined text-lg')} aria-hidden="true">
                  {c.icon}
                </span>
                {t(`landing.category.${c.key}`, {}, { defaultValue: c.label })}
              </Link>
            ))}
          </div>
        </section>

        {/* Tonight near you — live previews from the API */}
        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-16')}>
          <div
            className={cm.cn(
              cm.flex({ align: 'end', justify: 'between' }),
              cm.sp('mb', 8),
              'flex-wrap gap-4',
            )}
          >
            <div>
              <h2 className={cm.cn('text-3xl font-black tracking-tight')}>
                {t('landing.onSaleHeading', {}, { defaultValue: 'Tonight near you' })}
              </h2>
              <p className={cm.cn(cm.textMuted, cm.fontWeight('medium'), cm.sp('mt', 2))}>
                {t('landing.onSaleSub', {}, { defaultValue: 'Last minute tickets available now' })}
              </p>
            </div>
            <Link
              to="/events"
              className={cm.cn(
                cm.textSize('sm'),
                'font-bold text-primary inline-flex items-center gap-1 hover:underline',
              )}
            >
              {t('landing.viewAll', {}, { defaultValue: 'See all' })}
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          </div>
          {previews && previews.length > 0 ? (
            <div
              className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3')}
            >
              {previews.slice(0, 3).map((evt) => (
                <EventCard key={evt.id} event={evt} />
              ))}
            </div>
          ) : (
            <div
              className={cm.cn(
                'relative w-full max-w-lg p-10 rounded-[2rem] text-white text-center shadow-2xl shadow-primary/30 mx-auto',
              )}
              style={{
                background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
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
                style={{ background: 'var(--color-accent)', color: 'white' }}
              >
                {t('landing.heroEmptyCta', {}, { defaultValue: 'Host an event' })}
                <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                  arrow_forward
                </span>
              </Link>
            </div>
          )}
        </section>

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
            <div className={cm.sp('mb', 1)}>
              <BrandWordmark as="span" size="sm" footer />
            </div>
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
