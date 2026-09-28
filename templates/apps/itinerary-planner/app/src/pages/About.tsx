import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { PublicSiteFooter } from '../components/PublicSiteFooter.js'
import { PublicTopNav } from '../components/PublicTopNav.js'

export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      <PublicTopNav />
      <main
        data-mol-id="page-about"
        className={cm.cn(cm.mxAuto, 'max-w-3xl', cm.sp('px', 6), cm.sp('py', 12))}
      >
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-[0.25em] text-primary',
          )}
        >
          {t('about.eyebrow', { tagline: APP_TAGLINE }, { defaultValue: '{{tagline}}' })}
        </p>
        <h1
          className={cm.cn(
            cm.textSize('4xl'),
            cm.fontWeight('extrabold'),
            cm.sp('mt', 2),
            cm.sp('mb', 6),
          )}
          style={{ fontFamily: 'var(--font-headline)' }}
        >
          {t('about.pageTitle', { app: APP_NAME }, { defaultValue: 'About {{app}}' })}
        </h1>
        <div className={cm.cn('prose', cm.stack(4), 'text-on-surface-variant leading-relaxed')}>
          <p data-mol-id="about-intro">
            {t(
              'about.intro',
              { app: APP_NAME },
              {
                defaultValue:
                  '{{app}} turns a folder full of half-formed plans into a single, shared trip your whole group can actually follow. Build a day-by-day itinerary, drop in flights and hotels, map every stop, and track the budget — all in one calm place instead of a dozen tabs and a group chat.',
              },
            )}
          </p>
          <h2
            className={cm.cn(
              cm.textSize('xl'),
              cm.fontWeight('bold'),
              cm.sp('mt', 8),
              'text-on-surface',
            )}
            style={{ fontFamily: 'var(--font-headline)' }}
          >
            {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
          </h2>
          <p data-mol-id="about-mission">
            {t(
              'about.missionBody',
              { app: APP_NAME },
              {
                defaultValue:
                  'Travel planning should feel like the trip is already getting better, not like homework. {{app}} exists to make collaborative trips effortless — so every traveler shows up knowing the plan, and every stop tells a story worth remembering.',
              },
            )}
          </p>
          <h2
            className={cm.cn(
              cm.textSize('xl'),
              cm.fontWeight('bold'),
              cm.sp('mt', 8),
              'text-on-surface',
            )}
            style={{ fontFamily: 'var(--font-headline)' }}
          >
            {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
          </h2>
          <ul data-mol-id="about-features" className={cm.cn(cm.stack(2), 'list-disc pl-6')}>
            <li>
              {t(
                'about.featureTimelines',
                {},
                {
                  defaultValue:
                    'Day-by-day timelines — drag stops to reorder, drop in transport segments, and watch the itinerary recalculate as one living document.',
                },
              )}
            </li>
            <li>
              {t(
                'about.featureCollab',
                {},
                {
                  defaultValue:
                    'Real-time collaboration — invite up to five travelers per trip, with every change syncing live and comments threaded under each stop.',
                },
              )}
            </li>
            <li>
              {t(
                'about.featureBookings',
                {},
                {
                  defaultValue:
                    'Bookings in one inbox — flights, hotels, and activity confirmations land on the exact day they belong to.',
                },
              )}
            </li>
            <li>
              {t(
                'about.featureMapsBudget',
                {},
                {
                  defaultValue:
                    'Maps, destinations, and a shared budget — see the whole trip on a map, discover editor-curated destinations, and track expenses so nobody overspends.',
                },
              )}
            </li>
          </ul>
          <h2
            className={cm.cn(
              cm.textSize('xl'),
              cm.fontWeight('bold'),
              cm.sp('mt', 8),
              'text-on-surface',
            )}
            style={{ fontFamily: 'var(--font-headline)' }}
          >
            {t('about.contactTitle', {}, { defaultValue: 'Talk to us' })}
          </h2>
          <p data-mol-id="about-contact">
            {t(
              'about.contactBody',
              {},
              {
                defaultValue:
                  'Have feedback, found a bug, or planning something ambitious? Reach us from your account settings — every message goes to a real human on the team.',
              },
            )}
          </p>
        </div>
      </main>
      <PublicSiteFooter />
    </div>
  )
}

export default About
export { About as AboutPage }
