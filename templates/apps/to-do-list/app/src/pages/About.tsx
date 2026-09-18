import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'

const FEATURES: { id: string; defaultValue: string }[] = [
  {
    id: 'views',
    defaultValue:
      'Today, Inbox, and Upcoming views that separate what is due now from what can wait — plus a ⌘K command palette to capture or jump anywhere instantly.',
  },
  {
    id: 'projects',
    defaultValue:
      'Projects and sections with drag-to-reorder, three priority tiers, and unlimited labels you can filter across every project.',
  },
  {
    id: 'recurring',
    defaultValue:
      'Recurring tasks and push reminders — daily, weekly, monthly, or natural-language ("every Tue at 3pm") — so nothing slips.',
  },
  {
    id: 'focus',
    defaultValue:
      'Focus mode, completion streaks, and analytics that show your momentum over time.',
  },
  {
    id: 'plans',
    defaultValue:
      'Free forever for personal use; Pro and Team plans when you need higher limits, advanced features, and data export.',
  },
]

export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <ContentPageShell
      dataMolId="page-about"
      footer={<Footer />}
      eyebrow={t('about.eyebrow', {}, { defaultValue: 'About' })}
      title={t('about.pageTitle', { app: APP_NAME }, { defaultValue: 'About {{app}}' })}
    >
      <div className={cm.cn(cm.stack(8))}>
        <p data-mol-id="about-intro" className={cm.cn(cm.prose, 'text-on-surface-variant')}>
          {t(
            'about.intro',
            { app: APP_NAME },
            {
              defaultValue:
                '{{app}} is a lightweight task manager built for momentum. Capture everything in your Inbox, plan your day in Today, and let projects, labels, and recurring tasks keep the rest on track — without the clutter that makes most to-do apps feel like work.',
            },
          )}
        </p>

        <section data-mol-id="about-mission" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
            {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.missionBody',
              { app: APP_NAME },
              {
                defaultValue:
                  'We believe a task manager should get out of your way. {{app}} is fast to capture, calm to look at, and honest about what actually needs doing today — no gamified noise, no endless settings, just a clear view of your next move and the streak that keeps you going.',
              },
            )}
          </p>
        </section>

        <section data-mol-id="about-features" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
            {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
          </h2>
          <ul className={cm.cn(cm.stack(2), 'list-disc pl-6 text-on-surface-variant')}>
            {FEATURES.map((f) => (
              <li key={f.id}>{t(`about.feature.${f.id}`, {}, { defaultValue: f.defaultValue })}</li>
            ))}
          </ul>
        </section>

        <section data-mol-id="about-contact" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
            {t('about.contactTitle', {}, { defaultValue: 'Talk to us' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.contactBody',
              {},
              {
                defaultValue:
                  'Questions, feedback, or a bug to report? We would love to hear from you — reach the team from Settings, and a real person will get back to you.',
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
