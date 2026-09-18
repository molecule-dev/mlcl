import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { LandingFooter } from '../components/LandingFooter.js'
import { LandingTopNav } from '../components/LandingTopNav.js'

interface Feature {
  id: string
  icon: string
  titleKey: string
  titleDefault: string
  bodyKey: string
  bodyDefault: string
}

const FEATURES: Feature[] = [
  {
    id: 'compare',
    icon: 'compare_arrows',
    titleKey: 'about.feature.compare.title',
    titleDefault: 'Every airline on one screen',
    bodyKey: 'about.feature.compare.body',
    bodyDefault:
      'Live fares from 40+ carriers — full-service, low-cost, and regional — sortable by price, duration, stops, or carbon, with no airline favoritism baked in.',
  },
  {
    id: 'alerts',
    icon: 'trending_down',
    titleKey: 'about.feature.alerts.title',
    titleDefault: 'Price alerts that watch for you',
    bodyKey: 'about.feature.alerts.body',
    bodyDefault:
      'Track a route once and get pinged the moment the fare dips. We keep a full price history so you know whether today is actually a good day to book.',
  },
  {
    id: 'multicity',
    icon: 'route',
    titleKey: 'about.feature.multicity.title',
    titleDefault: 'Multi-city without the math',
    bodyKey: 'about.feature.multicity.body',
    bodyDefault:
      'Build itineraries with up to six segments across mixed cabins and mixed airlines — we thread the cheapest combination together automatically.',
  },
  {
    id: 'transparent',
    icon: 'receipt_long',
    titleKey: 'about.feature.transparent.title',
    titleDefault: 'Transparent, all-in pricing',
    bodyKey: 'about.feature.transparent.body',
    bodyDefault:
      'The number you see is the number you pay. Bags, seats, and carrier fees are surfaced up front so the cheapest result is genuinely the cheapest.',
  },
  {
    id: 'trips',
    icon: 'luggage',
    titleKey: 'about.feature.trips.title',
    titleDefault: 'Every trip in one place',
    bodyKey: 'about.feature.trips.body',
    bodyDefault:
      'Once you book, your confirmations, segments, and saved itineraries live together — so the whole journey is one tap away.',
  },
]

export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      <LandingTopNav />
      <main
        data-mol-id="page-about"
        className={cm.cn(cm.mxAuto, 'max-w-3xl', cm.sp('px', 6), cm.sp('py', 16))}
      >
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.sp('mb', 3),
            'uppercase tracking-[0.25em] text-primary',
          )}
        >
          {t('about.eyebrow', { app: APP_NAME }, { defaultValue: 'About {{app}}' })}
        </p>
        <h1
          className={cm.cn(
            cm.textSize('4xl'),
            cm.fontWeight('bold'),
            cm.sp('mb', 6),
            'leading-tight tracking-tight',
          )}
        >
          {t('about.pageTitle', {}, { defaultValue: 'Every route, one search.' })}
        </h1>

        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
          <p
            data-mol-id="about-intro"
            className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant leading-relaxed')}
          >
            {t(
              'about.intro',
              { app: APP_NAME },
              {
                defaultValue:
                  '{{app}} is a flight search platform that compares fares across every major airline in one place. We built it for travelers who actually compare — no dozen-tab browser marathons, no buried fees, no fake urgency timers. Just the real fares, ranked honestly.',
              },
            )}
          </p>
        </div>

        <h2
          className={cm.cn(
            cm.textSize('2xl'),
            cm.fontWeight('bold'),
            cm.sp('mt', 12),
            cm.sp('mb', 3),
            'tracking-tight',
          )}
        >
          {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
        </h2>
        <p
          data-mol-id="about-mission"
          className={cm.cn(cm.textSize('base'), 'text-on-surface-variant leading-relaxed')}
        >
          {t(
            'about.missionBody',
            { app: APP_NAME },
            {
              defaultValue:
                'Booking a flight should not feel like a negotiation with a slot machine. {{app}} exists to put travelers back in control: show every option side by side, tell the truth about price, and let people decide on their own terms. We make money from optional Pro features — never from steering you toward a pricier fare.',
            },
          )}
        </p>

        <h2
          className={cm.cn(
            cm.textSize('2xl'),
            cm.fontWeight('bold'),
            cm.sp('mt', 12),
            cm.sp('mb', 6),
            'tracking-tight',
          )}
        >
          {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
        </h2>
        <ul
          data-mol-id="about-features"
          className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}
        >
          {FEATURES.map((feature) => (
            <li
              key={feature.id}
              data-mol-id={`about-feature-${feature.id}`}
              className={cm.cn(cm.flex({ align: 'start', gap: 'md' }))}
            >
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.w(10),
                  cm.h(10),
                  'shrink-0 rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20',
                )}
                aria-hidden="true"
              >
                <span className={'material-symbols-outlined text-xl'}>{feature.icon}</span>
              </span>
              <div>
                <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'))}>
                  {t(feature.titleKey, {}, { defaultValue: feature.titleDefault })}
                </h3>
                <p
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.sp('mt', 1),
                    'text-on-surface-variant leading-relaxed',
                  )}
                >
                  {t(feature.bodyKey, {}, { defaultValue: feature.bodyDefault })}
                </p>
              </div>
            </li>
          ))}
        </ul>

        <h2
          className={cm.cn(
            cm.textSize('2xl'),
            cm.fontWeight('bold'),
            cm.sp('mt', 12),
            cm.sp('mb', 3),
            'tracking-tight',
          )}
        >
          {t('about.contactTitle', {}, { defaultValue: 'Talk to us' })}
        </h2>
        <p
          data-mol-id="about-contact"
          className={cm.cn(cm.textSize('base'), 'text-on-surface-variant leading-relaxed')}
        >
          {t(
            'about.contactBody',
            {},
            {
              defaultValue:
                'Found a fare we missed, hit a bug, or have an idea? Reach us from your account settings — every message lands with a real person on the team.',
            },
          )}
        </p>
      </main>
      <LandingFooter />
    </div>
  )
}

export default About
export { About as AboutPage }
