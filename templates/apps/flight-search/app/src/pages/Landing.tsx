import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { FlightResultCard, type FlightSummary } from '../components/FlightResultCard.js'
import { LandingFooter } from '../components/LandingFooter.js'
import { LandingTopNav } from '../components/LandingTopNav.js'
import { SkylarkHeroSearchCard } from '../components/SkylarkHeroSearchCard.js'

const FEATURE_CARDS = [
  {
    id: 'compare',
    icon: 'compare_arrows',
    eyebrow: 'Compare',
    title: 'Every airline, one screen',
    body: 'Live fares from 40+ carriers — full-service, low-cost, regional — sortable by price, duration, stops, or carbon.',
  },
  {
    id: 'alerts',
    icon: 'trending_down',
    eyebrow: 'Alert',
    title: 'Track fares that move',
    body: 'Watch a route once, get pinged the second it dips. Average member saves $237 per booked trip.',
  },
  {
    id: 'multicity',
    icon: 'route',
    eyebrow: 'Plan',
    title: 'Multi-city without the math',
    body: 'Up to six segments, mixed cabins, mixed airlines — {{app}} threads the cheapest combination automatically.',
  },
] as const

const PREVIEW_FLIGHTS: ReadonlyArray<FlightSummary> = [
  {
    id: 'demo-1',
    airline: 'Atlas Air',
    flight_number: 'AT 421',
    origin_code: 'JFK',
    origin_city: 'New York',
    destination_code: 'CDG',
    destination_city: 'Paris',
    departure_time: '2026-05-12T22:15:00Z',
    arrival_time: '2026-05-13T11:25:00Z',
    duration_minutes: 430,
    stops: 0,
    price: 482,
    cabin_class: 'economy',
    deal_label: 'cheapest',
  },
  {
    id: 'demo-2',
    airline: 'Skywell',
    flight_number: 'SW 8821',
    origin_code: 'JFK',
    origin_city: 'New York',
    destination_code: 'CDG',
    destination_city: 'Paris',
    departure_time: '2026-05-12T18:40:00Z',
    arrival_time: '2026-05-13T08:55:00Z',
    duration_minutes: 495,
    stops: 1,
    stop_cities: ['LHR'],
    price: 568,
    cabin_class: 'economy',
    deal_label: 'deal',
  },
  {
    id: 'demo-3',
    airline: 'Polar Edge',
    flight_number: 'PE 12',
    origin_code: 'JFK',
    origin_city: 'New York',
    destination_code: 'CDG',
    destination_city: 'Paris',
    departure_time: '2026-05-12T20:05:00Z',
    arrival_time: '2026-05-13T09:30:00Z',
    duration_minutes: 445,
    stops: 0,
    price: 894,
    cabin_class: 'premium_economy',
    deal_label: 'expensive',
  },
]

const SOCIAL_PROOF = [
  { count: '40+', label: 'airlines compared' },
  { count: '1.2M', label: 'price drops tracked' },
  { count: '$237', label: 'average saved per trip' },
  { count: '4.8★', label: 'on the App Store' },
] as const

/* Trending destinations (design: circular badges in a snap-scrolling row).
   Token-gradient monograms stand in for the design's photography. */
const TRENDING_DESTINATIONS = [
  { key: 'lisbon', city: 'Lisbon', code: 'LIS', tone: 'flight-dest-a' },
  { key: 'newYork', city: 'New York', code: 'JFK', tone: 'flight-dest-b' },
  { key: 'rome', city: 'Rome', code: 'FCO', tone: 'flight-dest-c' },
  { key: 'sydney', city: 'Sydney', code: 'SYD', tone: 'flight-dest-a' },
  { key: 'madrid', city: 'Madrid', code: 'MAD', tone: 'flight-dest-b' },
  { key: 'tokyo', city: 'Tokyo', code: 'HND', tone: 'flight-dest-c' },
  { key: 'paris', city: 'Paris', code: 'CDG', tone: 'flight-dest-a' },
] as const

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      {/* Top nav */}
      <LandingTopNav />

      <main>
        {/* Hero */}
        <section
          className={cm.cn(
            cm.maxW('7xl'),
            cm.sp('px', 6),
            cm.sp('pt', 10),
            cm.sp('pb', 16),
            cm.mxAuto,
          )}
        >
          <SkylarkHeroSearchCard />
        </section>

        {/* Feature triad */}
        <section className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.sp('pb', 20), cm.mxAuto)}>
          <div className={cm.cn(cm.flex({ align: 'end', justify: 'between' }), cm.sp('mb', 8))}>
            <div>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-[0.25em] text-primary',
                )}
              >
                {t('landing.features.eyebrow', { app: APP_NAME }, { defaultValue: 'Why {{app}}' })}
              </p>
              <h2
                className={cm.cn(
                  cm.textSize('4xl'),
                  cm.fontWeight('bold'),
                  cm.sp('mt', 2),
                  'leading-tight tracking-tight',
                )}
              >
                {t(
                  'landing.features.heading',
                  {},
                  { defaultValue: 'Built for travelers who actually compare' },
                )}
              </h2>
            </div>
          </div>
          <div className={cm.cn('grid grid-cols-1 md:grid-cols-3 gap-5')}>
            {FEATURE_CARDS.map((feature) => (
              <article
                key={feature.id}
                className={cm.cn(
                  cm.sp('p', 6),
                  'group relative bg-surface rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all ring-1 ring-outline-variant/40 overflow-hidden',
                )}
              >
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.w(12),
                    cm.h(12),
                    'rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20',
                  )}
                  aria-hidden="true"
                >
                  <span className={'material-symbols-outlined text-2xl'}>{feature.icon}</span>
                </span>
                <p
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    cm.sp('mt', 4),
                    'uppercase tracking-[0.25em] text-accent-dark',
                  )}
                >
                  {t(
                    `landing.features.${feature.id}.eyebrow`,
                    {},
                    { defaultValue: feature.eyebrow },
                  )}
                </p>
                <h3
                  className={cm.cn(
                    cm.textSize('xl'),
                    cm.fontWeight('bold'),
                    cm.sp('mt', 2),
                    'leading-tight tracking-tight',
                  )}
                >
                  {t(`landing.features.${feature.id}.title`, {}, { defaultValue: feature.title })}
                </h3>
                <p
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.sp('mt', 3),
                    'text-on-surface-variant leading-relaxed',
                  )}
                >
                  {t(
                    `landing.features.${feature.id}.body`,
                    { app: APP_NAME },
                    { defaultValue: feature.body },
                  )}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* Inside-the-app preview */}
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
                  {t('landing.preview.eyebrow', {}, { defaultValue: 'A peek inside' })}
                </p>
                <h2
                  className={cm.cn(
                    cm.textSize('4xl'),
                    cm.fontWeight('bold'),
                    cm.sp('mt', 2),
                    'leading-tight tracking-tight',
                  )}
                >
                  {t(
                    'landing.preview.heading',
                    { route: 'JFK → CDG' },
                    { defaultValue: 'Live results for {{route}}' },
                  )}
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
                    { app: APP_NAME },
                    {
                      defaultValue:
                        'This is exactly how a real search looks on {{app}} — deal pills, route diagrams, tabular fares.',
                    },
                  )}
                </p>
              </div>
              <Link
                to="/search"
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'text-primary hover:underline inline-flex items-center gap-1',
                )}
              >
                {t('landing.preview.searchCta', {}, { defaultValue: 'Search your own route' })}
                <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                  arrow_forward
                </span>
              </Link>
            </div>
            <div className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
              {PREVIEW_FLIGHTS.map((flight) => (
                <FlightResultCard key={flight.id} flight={flight} />
              ))}
            </div>
          </div>
        </section>

        {/* Trending destinations — design section, adapted to token badges */}
        <section
          className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.sp('py', 20), cm.mxAuto)}
          aria-labelledby="landing-trending-heading"
        >
          <h2
            id="landing-trending-heading"
            className={cm.cn(
              cm.textSize('2xl'),
              cm.fontWeight('bold'),
              cm.sp('mb', 8),
              'tracking-tight',
            )}
          >
            {t('landing.trending.heading', {}, { defaultValue: 'Trending destinations' })}
          </h2>
          <div className={cm.cn(cm.flex({ gap: 'lg' }), 'overflow-x-auto pb-2')}>
            {TRENDING_DESTINATIONS.map((d) => (
              <Link
                key={d.key}
                to="/search"
                data-mol-id={`landing-trending-${d.key}`}
                className={cm.cn('group flex flex-col items-center gap-3 shrink-0 snap-center')}
              >
                <span
                  className={cm.cn(
                    cm.roundedFull,
                    cm.flex({ align: 'center', justify: 'center' }),
                    'w-24 h-24 text-lg font-bold text-white tabular-nums ring-4 ring-transparent group-hover:ring-primary/20 group-hover:scale-105 transition-all',
                    d.tone,
                  )}
                  aria-hidden="true"
                >
                  {d.code}
                </span>
                <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>
                  {t(`landing.trending.${d.key}`, {}, { defaultValue: d.city })}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Social proof */}
        <section className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.sp('py', 20), cm.mxAuto)}>
          <div className={cm.cn('grid grid-cols-2 md:grid-cols-4 gap-6')}>
            {SOCIAL_PROOF.map((stat) => (
              <div key={stat.label} className={cm.textCenter}>
                <p
                  className={cm.cn(
                    cm.textSize('4xl'),
                    cm.fontWeight('bold'),
                    'tabular-nums tracking-tight text-primary',
                  )}
                >
                  {stat.count}
                </p>
                <p
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.sp('mt', 2),
                    cm.fontWeight('bold'),
                    'uppercase tracking-[0.25em] text-on-surface-variant',
                  )}
                >
                  {t(
                    `landing.proof.${stat.label.replace(/\s+/g, '_')}`,
                    {},
                    { defaultValue: stat.label },
                  )}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA band */}
        <section className={cm.cn('bg-primary text-on-primary relative overflow-hidden')}>
          <div
            className={cm.cn(
              cm.w(96),
              cm.h(96),
              cm.roundedFull,
              'absolute -right-24 -bottom-24 bg-accent/30 blur-3xl',
            )}
            aria-hidden="true"
          />
          <div
            className={cm.cn(
              cm.w(80),
              cm.h(80),
              cm.roundedFull,
              'absolute -left-20 -top-20 bg-surface/10 blur-3xl',
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
                'uppercase tracking-[0.25em] text-accent-light',
              )}
            >
              {t('landing.cta.eyebrow', { app: APP_NAME }, { defaultValue: '{{app}} Pro' })}
            </p>
            <h2
              className={cm.cn(
                cm.textSize('5xl'),
                cm.fontWeight('bold'),
                cm.sp('mt', 3),
                'leading-[0.95] tracking-tight',
              )}
            >
              {t(
                'landing.cta.heading',
                {},
                { defaultValue: 'Find the next great fare before everyone else.' },
              )}
            </h2>
            <p
              className={cm.cn(
                cm.textSize('lg'),
                cm.sp('mt', 4),
                cm.maxW('2xl'),
                cm.mxAuto,
                'text-white/85',
              )}
            >
              {t(
                'landing.cta.subheading',
                {},
                {
                  defaultValue:
                    'Unlimited price alerts, multi-city itineraries, and member-only error fares — free to start, $9/month for Pro.',
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
                {t('landing.cta.signup', {}, { defaultValue: 'Start tracking fares' })}
              </Link>
              <Link
                to="/search"
                className={cm.cn(
                  cm.sp('px', 8),
                  cm.sp('py', 3),
                  cm.fontWeight('semibold'),
                  'rounded-full border border-surface/40 text-white hover:bg-surface/10 transition-colors',
                )}
              >
                {t('landing.cta.explore', {}, { defaultValue: 'Try a search' })}
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <LandingFooter />
    </div>
  )
}
