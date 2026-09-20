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
    id: 'boards',
    icon: 'schedule',
    titleKey: 'about.feature.boards.title',
    titleDefault: 'Live boards for every stop',
    bodyKey: 'about.feature.boards.body',
    bodyDefault:
      'Countdowns for every line serving a stop — when the next metro, tram, or bus actually arrives, refreshed from the running schedule.',
  },
  {
    id: 'alerts',
    icon: 'notifications_active',
    titleKey: 'about.feature.alerts.title',
    titleDefault: 'Service alerts before you leave',
    bodyKey: 'about.feature.alerts.body',
    bodyDefault:
      'Detours, single-tracking, and holiday schedules surface on the board and the planner — not after you are already standing at the platform.',
  },
  {
    id: 'planner',
    icon: 'route',
    titleKey: 'about.feature.planner.title',
    titleDefault: 'A trip planner that transfers',
    bodyKey: 'about.feature.planner.body',
    bodyDefault:
      'Origin to destination across every line, with the fastest, fewest-transfer, and direct options side by side — clock times included.',
  },
  {
    id: 'lines',
    icon: 'map',
    titleKey: 'about.feature.lines.title',
    titleDefault: 'The whole network, mapped',
    bodyKey: 'about.feature.lines.body',
    bodyDefault:
      'Every line with its route map, stop list, first/last service, and frequency — the printed diagram, always current.',
  },
  {
    id: 'saved',
    icon: 'bookmark',
    titleKey: 'about.feature.saved.title',
    titleDefault: 'Your stops, one tap away',
    bodyKey: 'about.feature.saved.body',
    bodyDefault:
      'Save the stops you actually use and the boards are on your home screen — no search, no digging through a map.',
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
          {t('about.pageTitle', {}, { defaultValue: 'Every line, every stop, live.' })}
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
                  '{{app}} is a public-transit companion: live arrival boards, line maps, service alerts, and a door-to-stop trip planner for the whole network. We built it for people who plan their day around the timetable — no refreshing a stale app, no guessing whether the bus already left.',
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
                'Using transit should not feel like a gamble. {{app}} exists to put riders back in control: show every line serving a stop, tell the truth about disruptions, and plan the trip across transfers automatically. Boards, alerts, and the planner are free — we make money from optional Pro conveniences, never from the timetable itself.',
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
                'Spotted a stale board, hit a bug, or have an idea? Reach us from your account settings — every message lands with a real person on the team.',
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
