import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AuthBrandHeader } from '../components/AuthBrandHeader.js'
import { Footer } from '../components/Footer.js'

export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <ContentPageShell
      dataMolId="page-about"
      header={<AuthBrandHeader />}
      footer={<Footer />}
      eyebrow={t('about.eyebrow', {}, { defaultValue: 'About' })}
      title={t('about.pageTitle', { app: APP_NAME }, { defaultValue: `About ${APP_NAME}` })}
    >
      <div className={cm.cn(cm.stack(8))}>
        <p data-mol-id="about-intro" className={cm.cn(cm.prose, 'text-on-surface-variant')}>
          {t(
            'about.intro',
            { app: APP_NAME },
            {
              defaultValue:
                '{{app}} is a broadcast-quality home for your league. Teams, schedules, live scores, and standings come together in one fast, clutter-free dashboard — so fans, coaches, and league organizers always know where the season stands.',
            },
          )}
        </p>

        <section data-mol-id="about-mission" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.missionBody',
              {},
              {
                defaultValue:
                  'Following a league should not mean refreshing five different third-party scoreboards. We built it to give every league a single source of truth for the standings, the schedule, and the stats that actually matter — updated at every whistle, free for the season.',
              },
            )}
          </p>
        </section>

        <section data-mol-id="about-features" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.whatYouGet', {}, { defaultValue: 'What you get' })}
          </h2>
          <ul className={cm.cn(cm.stack(2), 'list-disc pl-6 text-on-surface-variant')}>
            <li>
              {t(
                'about.featureStandings',
                {},
                {
                  defaultValue:
                    'Live standings — real-time win-loss-draw records, points, win-pct, and the playoff line, refreshed at every whistle.',
                },
              )}
            </li>
            <li>
              {t(
                'about.featureScoreboard',
                {},
                {
                  defaultValue:
                    'A broadcast-grade scoreboard ticker pinned to the top of every page so you never miss a goal.',
                },
              )}
            </li>
            <li>
              {t(
                'about.featureRosters',
                {},
                {
                  defaultValue:
                    'Team pages with full rosters, season totals, hot/cold streaks, and head-to-head splits for every player.',
                },
              )}
            </li>
            <li>
              {t(
                'about.featureSchedule',
                {},
                {
                  defaultValue:
                    'A season calendar and schedule view so you can plan around every fixture and result.',
                },
              )}
            </li>
            <li>
              {t(
                'about.featureAlerts',
                {},
                {
                  defaultValue:
                    'Push notifications for score updates, trade alerts, injury reports, and league announcements.',
                },
              )}
            </li>
          </ul>
        </section>

        <section data-mol-id="about-contact" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.contactTitle', {}, { defaultValue: 'Get in touch' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.contactBody',
              { app: APP_NAME },
              {
                defaultValue:
                  'Have feedback, found a bug, or want {{app}} for your league? Reach us from your account settings — every message goes to a real person on the team.',
              },
            )}
          </p>
        </section>
      </div>
    </ContentPageShell>
  )
}

export default About
export { About as AboutPage }
