import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'

export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <ContentPageShell
      dataMolId="page-about"
      footer={<Footer />}
      eyebrow={t('nav.about', {}, { defaultValue: 'About' })}
      title={t('about.pageTitle', { app: APP_NAME }, { defaultValue: `About ${APP_NAME}` })}
    >
      <div className={cm.cn(cm.stack(4))}>
        <p data-mol-id="about-intro" className={cm.cn(cm.prose, 'text-on-surface-variant')}>
          {t(
            'about.intro',
            { app: APP_NAME },
            {
              defaultValue: `${APP_NAME} is a Trello-style board for product and engineering teams — boards, lists, and cards with labels, drag-and-drop, comments, and realtime collaboration. It is built for the rhythm of real product work, not clone nostalgia.`,
            },
          )}
        </p>

        <h2
          className={cm.cn(
            cm.textSize('xl'),
            cm.fontWeight('bold'),
            cm.sp('mt', 8),
            'font-display',
          )}
        >
          {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
        </h2>
        <p data-mol-id="about-mission" className={cm.cn(cm.prose, 'text-on-surface-variant')}>
          {t(
            'about.missionBody',
            { app: APP_NAME },
            {
              defaultValue: `We believe planning tools should get out of the way. ${APP_NAME} keeps every primitive your team already trusts — boards, swimlanes, work-in-progress caps — while making collaboration feel instant and the whole surface keyboard-first.`,
            },
          )}
        </p>

        <h2
          className={cm.cn(
            cm.textSize('xl'),
            cm.fontWeight('bold'),
            cm.sp('mt', 8),
            'font-display',
          )}
        >
          {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
        </h2>
        <ul
          data-mol-id="about-features"
          className={cm.cn(cm.stack(2), cm.prose, 'list-disc pl-6 text-on-surface-variant')}
        >
          <li>
            {t(
              'about.featureBoards',
              {},
              {
                defaultValue:
                  'Boards, lists, and cards with drag-and-drop ordering, labels, due dates, priorities, checklists, and attachments.',
              },
            )}
          </li>
          <li>
            {t(
              'about.featureRealtime',
              {},
              {
                defaultValue:
                  'Realtime collaboration — watch teammates move cards, leave comments, and update checklists with live presence.',
              },
            )}
          </li>
          <li>
            {t(
              'about.featurePermissions',
              {},
              {
                defaultValue:
                  'Workspace-grade permissions with owner, admin, member, and viewer roles per board, plus an activity log on every change.',
              },
            )}
          </li>
          <li>
            {t(
              'about.featureKeyboard',
              {},
              {
                defaultValue:
                  'A keyboard-first feel: a Mod+K command palette, shortcut-driven navigation, and a sub-100ms response built for power users.',
              },
            )}
          </li>
        </ul>

        <h2
          className={cm.cn(
            cm.textSize('xl'),
            cm.fontWeight('bold'),
            cm.sp('mt', 8),
            'font-display',
          )}
        >
          {t('about.contactTitle', {}, { defaultValue: 'Talk to us' })}
        </h2>
        <p data-mol-id="about-contact" className={cm.cn(cm.prose, 'text-on-surface-variant')}>
          {t(
            'about.contactBody',
            {},
            {
              defaultValue:
                'Have feedback, found a bug, or want a feature? Reach out from your account settings — every message goes to a real human on the team.',
            },
          )}
        </p>
      </div>
    </ContentPageShell>
  )
}

export default About
export { About as AboutPage }
