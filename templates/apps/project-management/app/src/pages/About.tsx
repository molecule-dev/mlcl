import { useEffect } from 'react'

import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

interface Feature {
  id: string
  titleKey: string
  titleDefault: string
  bodyKey: string
  bodyDefault: string
}

const FEATURES: Feature[] = [
  {
    id: 'kanban',
    titleKey: 'about.feature.kanban.title',
    titleDefault: 'Kanban boards',
    bodyKey: 'about.feature.kanban.body',
    bodyDefault:
      'Drag tasks across To-do, In-progress, Review, and Done columns. Every move is saved instantly so the board always reflects where work really stands.',
  },
  {
    id: 'milestones',
    titleKey: 'about.feature.milestones.title',
    titleDefault: 'Milestones & timeline',
    bodyKey: 'about.feature.milestones.body',
    bodyDefault:
      'Group tasks under milestones with due dates and watch deadlines line up on a calendar timeline, so nothing slips between the cracks.',
  },
  {
    id: 'team',
    titleKey: 'about.feature.team.title',
    titleDefault: 'Team views & roles',
    bodyKey: 'about.feature.team.body',
    bodyDefault:
      'Invite teammates to a project, assign tasks, and give each person the right role — so everyone sees exactly the work that is theirs.',
  },
  {
    id: 'realtime',
    titleKey: 'about.feature.realtime.title',
    titleDefault: 'Realtime collaboration',
    bodyKey: 'about.feature.realtime.body',
    bodyDefault:
      'Changes appear live for everyone on a project. Comment on tasks, follow the activity feed, and stay in sync without refreshing.',
  },
  {
    id: 'search',
    titleKey: 'about.feature.search.title',
    titleDefault: 'Fast search & notifications',
    bodyKey: 'about.feature.search.body',
    bodyDefault:
      'Jump to any project, task, or person with instant search, and get email and push notifications the moment work is assigned or updated.',
  },
]

/**
 * Public "About" page for the project-management app. Mirrors the branded
 * {@link ContentPageShell} chrome used by Privacy / Terms / Pricing so the
 * brand stays consistent, with copy grounded in the app's real feature set
 * (Kanban, milestones, team views, realtime collaboration).
 *
 * @returns The rendered About page.
 */
export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const pageTitle = t(
    'about.pageTitle',
    { appName: APP_NAME },
    { defaultValue: `About ${APP_NAME}` },
  )

  useEffect(() => {
    document.title = pageTitle
  }, [pageTitle])

  return (
    <ContentPageShell
      dataMolId="page-about"
      eyebrow={t('nav.about', {}, { defaultValue: 'About' })}
      title={pageTitle}
    >
      <div className={cm.stack(8)}>
        <p
          data-mol-id="about-intro"
          className={cm.cn(cm.textSize('base'), 'text-on-surface-variant')}
        >
          {t(
            'about.intro',
            { appName: APP_NAME },
            {
              defaultValue: `${APP_NAME} is task and project management built for teams who actually ship. Plan work on Kanban boards, track it against milestones, and keep everyone aligned on a shared timeline — without the clutter of tools nobody opens.`,
            },
          )}
        </p>

        <section data-mol-id="about-mission" className={cm.stack(2)}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'text-on-surface')}>
            {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
          </h2>
          <p className={cm.cn(cm.textSize('base'), 'text-on-surface-variant')}>
            {t(
              'about.missionBody',
              { appName: APP_NAME },
              {
                defaultValue: `We believe a team's tools should disappear into the work. ${APP_NAME} gives you just enough structure — boards, milestones, roles, and realtime updates — to coordinate a team without endless meetings or status pings, so you can spend your time building instead of reporting.`,
              },
            )}
          </p>
        </section>

        <section data-mol-id="about-features" className={cm.stack(4)}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'text-on-surface')}>
            {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
          </h2>
          <ul className={cm.cn(cm.stack(4), 'list-disc pl-6 text-on-surface-variant')}>
            {FEATURES.map((feature) => (
              <li key={feature.id} data-mol-id={`about-feature-${feature.id}`}>
                <span className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface')}>
                  {t(feature.titleKey, {}, { defaultValue: feature.titleDefault })}
                </span>{' '}
                — {t(feature.bodyKey, {}, { defaultValue: feature.bodyDefault })}
              </li>
            ))}
          </ul>
        </section>

        <section data-mol-id="about-contact" className={cm.stack(2)}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'text-on-surface')}>
            {t('about.contactTitle', {}, { defaultValue: 'Talk to us' })}
          </h2>
          <p className={cm.cn(cm.textSize('base'), 'text-on-surface-variant')}>
            {t(
              'about.contactBody',
              {},
              {
                defaultValue:
                  'Have feedback, hit a bug, or want a feature? Check the Help page for answers, or reach the team from Settings → Account — every message goes to a real person.',
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
