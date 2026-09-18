import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { LandingFooter } from '../components/LandingFooter.js'
import { LandingNav } from '../components/LandingNav.js'

const FEATURES: { key: string; defaultValue: string }[] = [
  {
    key: 'about.featureCompare',
    defaultValue:
      'Compare every retailer on one screen — Amazon, Best Buy, Target, Walmart and 30+ stores, ranked by true delivered cost.',
  },
  {
    key: 'about.featureHistory',
    defaultValue:
      'A 12-month price-history chart that exposes fake "lowest price ever" claims so you know what a product really costs.',
  },
  {
    key: 'about.featureAlerts',
    defaultValue:
      'Drop alerts: set a target price and {{app}} pings you the instant your watchlist hits it — no noisy daily spam.',
  },
  {
    key: 'about.featureSavings',
    defaultValue:
      'A savings dashboard tracking lifetime savings, average wait time per drop, and your top-saving retailers.',
  },
  {
    key: 'about.featureWatchlist',
    defaultValue:
      'A personal watchlist that keeps the products you care about one tap away across every device.',
  },
]

export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div
      className={cm.cn(
        cm.minH('screen'),
        'bg-gradient-to-b from-background via-surface to-surface-container-low text-on-surface antialiased',
      )}
    >
      <LandingNav />
      <main
        data-mol-id="page-about"
        className={cm.cn(cm.mxAuto, 'max-w-3xl', cm.sp('px', 6), cm.sp('py', 16))}
      >
        <p
          className={cm.cn('text-[10px] font-black uppercase tracking-widest text-primary')}
          data-mol-id="about-eyebrow"
        >
          {t('about.eyebrow', { app: APP_NAME }, { defaultValue: 'About {{app}}' })}
        </p>
        <h1
          className={cm.cn(
            cm.sp('mt', 2),
            cm.sp('mb', 6),
            'text-4xl md:text-5xl font-extrabold tracking-tight text-on-surface',
          )}
        >
          {t('about.pageTitle', {}, { defaultValue: 'Never overpay again.' })}
        </h1>

        <div
          className={cm.cn(
            cm.stack(5),
            cm.textSize('lg'),
            'text-on-surface-variant leading-relaxed',
          )}
        >
          <p data-mol-id="about-intro">
            {t(
              'about.intro',
              { app: APP_NAME },
              {
                defaultValue:
                  '{{app}} is the price-comparison companion that makes sure you stop overpaying. Search any product once and {{app}} fans out across 30+ retailers, ranks them by total delivered cost, and keeps watching so you buy at exactly the right moment.',
              },
            )}
          </p>

          <h2
            className={cm.cn(
              cm.sp('mt', 8),
              cm.textSize('2xl'),
              cm.fontWeight('extrabold'),
              'text-on-surface tracking-tight',
            )}
          >
            {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
          </h2>
          <p data-mol-id="about-mission">
            {t(
              'about.missionBody',
              { app: APP_NAME },
              {
                defaultValue:
                  'Shoppers deserve the same price intelligence big retailers use against them. {{app}} puts honest, affiliate-bias-free price history and real-time drop alerts in everyone’s hands — so the best price finds you, instead of the other way around.',
              },
            )}
          </p>

          <h2
            className={cm.cn(
              cm.sp('mt', 8),
              cm.textSize('2xl'),
              cm.fontWeight('extrabold'),
              'text-on-surface tracking-tight',
            )}
          >
            {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
          </h2>
          <ul
            data-mol-id="about-features"
            className={cm.cn(cm.stack(3), 'list-disc pl-6 marker:text-primary')}
          >
            {FEATURES.map((f) => (
              <li key={f.key}>{t(f.key, { app: APP_NAME }, { defaultValue: f.defaultValue })}</li>
            ))}
          </ul>

          <h2
            className={cm.cn(
              cm.sp('mt', 8),
              cm.textSize('2xl'),
              cm.fontWeight('extrabold'),
              'text-on-surface tracking-tight',
            )}
          >
            {t('about.contactTitle', {}, { defaultValue: 'Talk to us' })}
          </h2>
          <p data-mol-id="about-contact">
            {t(
              'about.contactBody',
              { app: APP_NAME },
              {
                defaultValue:
                  'Have a question, a retailer we should add, or a price that looks wrong? Reach the {{app}} team any time — every message reaches a real person on the team.',
              },
            )}
          </p>
        </div>
      </main>
      <LandingFooter />
    </div>
  )
}

export default About
export { About as AboutPage }
