import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { type Arrival, ArrivalRow } from '../components/ArrivalRow.js'
import { LandingFooter } from '../components/LandingFooter.js'
import { LandingTopNav } from '../components/LandingTopNav.js'
import { StopSearchCard } from '../components/StopSearchCard.js'

const FEATURE_CARDS = [
  {
    id: 'boards',
    icon: 'schedule',
    eyebrow: 'Boards',
    title: 'Every stop is a departures board',
    body: 'Countdowns for every line serving the stop — metro, tram, and bus together, sorted by what arrives next.',
  },
  {
    id: 'alerts',
    icon: 'notifications_active',
    eyebrow: 'Alerts',
    title: 'Know before you leave',
    body: 'Detours, single-tracking, and holiday schedules sit right on the board — not buried in a service-status PDF.',
  },
  {
    id: 'planner',
    icon: 'route',
    eyebrow: 'Plan',
    title: 'Trips that transfer',
    body: 'Pick origin and destination; {{app}} threads the fastest, fewest-transfer, and direct options across every line.',
  },
] as const

/** Static preview board — the same row shape the live API returns. */
const PREVIEW_ARRIVALS: ReadonlyArray<Arrival> = [
  {
    lineCode: 'M1',
    direction: 1,
    destinationStop: 'NOR',
    destinationName: 'Northgate',
    arrivalEpochMs: Date.now() + 2 * 60_000,
    secondsUntil: 120,
    line: { code: 'M1', name: 'Red Line', kind: 'metro', color: '#d32f2f' },
  },
  {
    lineCode: 'T1',
    direction: 0,
    destinationStop: 'LAK',
    destinationName: 'Lakeview Terrace',
    arrivalEpochMs: Date.now() + 5 * 60_000,
    secondsUntil: 300,
    line: { code: 'T1', name: 'Green Line', kind: 'tram', color: '#2e7d32' },
  },
  {
    lineCode: 'B2',
    direction: 0,
    destinationStop: 'HOS',
    destinationName: 'City Hospital',
    arrivalEpochMs: Date.now() + 9 * 60_000,
    secondsUntil: 540,
    line: { code: 'B2', name: 'Purple Line', kind: 'bus', color: '#6d28d9' },
  },
]

const SOCIAL_PROOF = [
  { count: '6', label: 'lines covered' },
  { count: '36', label: 'stops with live boards' },
  { count: '24/7', label: 'schedule simulation' },
  { count: '3', label: 'itinerary options per trip' },
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
          <div className={cm.cn(cm.maxW('3xl'), cm.sp('mb', 8))}>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-[0.25em] text-primary',
              )}
            >
              {t('landing.hero.eyebrow', {}, { defaultValue: 'City transit, live' })}
            </p>
            <h1
              className={cm.cn(
                cm.textSize('5xl'),
                cm.fontWeight('bold'),
                cm.sp('mt', 3),
                'leading-[0.95] tracking-tight font-headline',
              )}
            >
              {t(
                'landing.hero.heading',
                { app: APP_NAME },
                { defaultValue: '{{app}} — every line, every stop, live.' },
              )}
            </h1>
            <p
              className={cm.cn(
                cm.textSize('lg'),
                cm.sp('mt', 4),
                'text-on-surface-variant leading-relaxed',
              )}
            >
              {t(
                'landing.hero.subheading',
                {},
                {
                  defaultValue:
                    'Search a stop to see its departures board, plan a trip across lines, and never wonder "did I just miss it?" again.',
                },
              )}
            </p>
          </div>
          <StopSearchCard />
        </section>

        {/* Feature triad */}
        <section className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.sp('pb', 20), cm.mxAuto)}>
          {/* Section heading — NOT a <header>: the app shell topbar is the one
              true header; extra <header> elements flag duplicate-brand audits. */}
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
                  'leading-tight tracking-tight font-headline',
                )}
              >
                {t(
                  'landing.features.heading',
                  {},
                  { defaultValue: 'Built for people who ride every day' },
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
                    'h-12 w-12 rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20',
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
                    'leading-tight tracking-tight font-headline',
                  )}
                >
                  {t(
                    'landing.preview.heading',
                    {},
                    { defaultValue: 'The board, as it lives in the app' },
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
                        'Route badge, destination, minutes-until, and clock time — this is exactly how every stop board on {{app}} reads.',
                    },
                  )}
                </p>
              </div>
              <Link
                to="/nearby"
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'text-primary hover:underline inline-flex items-center gap-1',
                )}
              >
                {t('landing.preview.nearbyCta', {}, { defaultValue: 'Browse every stop' })}
                <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                  arrow_forward
                </span>
              </Link>
            </div>
            <div className={cm.cn(cm.maxW('3xl'))}>
              <ul className={cm.flex({ direction: 'col', gap: 'sm' })}>
                {PREVIEW_ARRIVALS.map((arrival, index) => (
                  <ArrivalRow key={index} arrival={arrival} />
                ))}
              </ul>
            </div>
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
                'uppercase tracking-[0.25em] text-accent-dark',
              )}
            >
              {t('landing.cta.eyebrow', { app: APP_NAME }, { defaultValue: '{{app}} Pro' })}
            </p>
            <h2
              className={cm.cn(
                cm.textSize('5xl'),
                cm.fontWeight('bold'),
                cm.sp('mt', 3),
                'leading-[0.95] tracking-tight font-headline',
              )}
            >
              {t('landing.cta.heading', {}, { defaultValue: 'Stop waiting. Start timing.' })}
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
                    'Boards and the trip planner are free forever. Pro adds unlimited saved stops, alert subscriptions, and frequency history — $5/month.',
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
                {t('landing.cta.signup', {}, { defaultValue: 'Create a free account' })}
              </Link>
              <Link
                to="/plan"
                className={cm.cn(
                  cm.sp('px', 8),
                  cm.sp('py', 3),
                  cm.fontWeight('semibold'),
                  'rounded-full border border-surface/40 text-white hover:bg-surface/10 transition-colors',
                )}
              >
                {t('landing.cta.explore', {}, { defaultValue: 'Plan a trip' })}
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
