import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { PublicPageNav } from '../components/PublicPageNav.js'

export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      <PublicPageNav />
      <main
        data-mol-id="page-about"
        className={cm.cn(cm.mxAuto, 'max-w-3xl', cm.sp('px', 6), cm.sp('py', 16))}
      >
        <h1
          className={cm.cn(
            cm.textSize('4xl'),
            cm.fontWeight('bold'),
            cm.sp('mb', 6),
            'font-display tracking-tight',
          )}
        >
          {t('about.pageTitle', { app: APP_NAME }, { defaultValue: 'About {{app}}' })}
        </h1>
        <div className={cm.cn(cm.stack(4), 'text-on-surface-variant leading-relaxed')}>
          <p data-mol-id="about-intro" className={cm.textSize('lg')}>
            {t(
              'about.intro',
              { app: APP_NAME },
              {
                defaultValue:
                  '{{app}} is a warm, all-in-one point of sale for restaurants, cafés, and quick-service kitchens. It replaces three half-broken systems with one fast platform — a kitchen display, a live floor plan, table-side QR ordering, and service analytics — running on whatever tablet or phone your team already has.',
              },
            )}
          </p>
          <h2
            className={cm.cn(
              cm.textSize('xl'),
              cm.fontWeight('semibold'),
              cm.sp('mt', 8),
              'font-display text-on-surface',
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
                  'Great service shouldn’t be held back by clunky kiosks, franchise lock-in, or weekly reboots. {{app}} keeps the front of house and the line in sync in real time, so servers, cooks, and owners all see the same source of truth — and every guest gets seated, fed, and paid out without friction.',
              },
            )}
          </p>
          <h2
            className={cm.cn(
              cm.textSize('xl'),
              cm.fontWeight('semibold'),
              cm.sp('mt', 8),
              'font-display text-on-surface',
            )}
          >
            {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
          </h2>
          <ul data-mol-id="about-features" className={cm.cn(cm.stack(2), 'list-disc pl-6')}>
            <li>
              {t(
                'about.featureKitchen',
                {},
                {
                  defaultValue:
                    'A kitchen display that turns ticket chaos into a clean kanban board — new, preparing, ready, served — with live timers per item.',
                },
              )}
            </li>
            <li>
              {t(
                'about.featureFloor',
                {},
                {
                  defaultValue:
                    'A smart floor plan: seat a party, watch ticket times tick, and track every table as available, occupied, reserved, or dirty.',
                },
              )}
            </li>
            <li>
              {t(
                'about.featureQr',
                {},
                {
                  defaultValue:
                    'Table-side QR menus so guests order from their own phones, the kitchen sees it instantly, and payments split themselves.',
                },
              )}
            </li>
            <li>
              {t(
                'about.featureManagement',
                {},
                {
                  defaultValue:
                    'Menu, reservation, and customer management — dietary tags, item photos, party bookings, and visit history all in one place.',
                },
              )}
            </li>
            <li>
              {t(
                'about.featureAnalytics',
                {},
                {
                  defaultValue:
                    'Service analytics with hourly revenue, top items, and server leaderboards, plus real-time order tracking from order to payment.',
                },
              )}
            </li>
          </ul>
          <h2
            className={cm.cn(
              cm.textSize('xl'),
              cm.fontWeight('semibold'),
              cm.sp('mt', 8),
              'font-display text-on-surface',
            )}
          >
            {t('about.contactTitle', {}, { defaultValue: 'Talk to us' })}
          </h2>
          <p data-mol-id="about-contact">
            {t(
              'about.contactBody',
              {},
              {
                defaultValue:
                  'Questions, feedback, or want a hand importing last week of orders so you start with real numbers? Reach out from your dashboard — every message goes to a real human on the team.',
              },
            )}
          </p>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default About
export { About as AboutPage }
