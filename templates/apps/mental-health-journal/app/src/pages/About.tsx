import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { PublicNav } from '../components/PublicNav.js'

export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      <PublicNav />
      <main
        data-mol-id="page-about"
        className={cm.cn(cm.mxAuto, 'max-w-3xl', cm.sp('px', 6), cm.sp('py', 16))}
      >
        <h1 className={cm.cn(cm.textSize('4xl'), cm.fontWeight('extrabold'), cm.sp('mb', 6))}>
          {t('about.pageTitle', { app: APP_NAME }, { defaultValue: 'About {{app}}' })}
        </h1>
        <div className={cm.cn(cm.stack(4), cm.textSize('lg'), 'text-on-surface-variant')}>
          <p data-mol-id="about-intro">
            {t(
              'about.intro',
              { app: APP_NAME },
              {
                defaultValue:
                  '{{app}} is a gentle, private mental health journal for daily reflection, mood tracking, and gratitude. Thoughtful prompts replace the blank page, quiet pattern-finding helps you understand what affects how you feel, and end-to-end encryption keeps your words yours.',
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
          >
            {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
          </h2>
          <p data-mol-id="about-mission">
            {t(
              'about.missionBody',
              { app: APP_NAME },
              {
                defaultValue:
                  'We believe checking in with yourself should feel calm, never clinical — and never like another app demanding your attention. {{app}} is built to help, not nag: a few quiet minutes a day to notice your mood, write honestly, and slowly see yourself more clearly.',
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
          >
            {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
          </h2>
          <ul data-mol-id="about-features" className={cm.cn(cm.stack(2), 'list-disc pl-6')}>
            <li>
              {t(
                'about.featurePrompts',
                {},
                {
                  defaultValue:
                    'Gentle daily prompts so you always have somewhere to start — never a blank page.',
                },
              )}
            </li>
            <li>
              {t(
                'about.featureMood',
                {},
                {
                  defaultValue:
                    'Mood and activity tracking with a calendar view and trend charts that surface what helps you thrive.',
                },
              )}
            </li>
            <li>
              {t(
                'about.featureInsights',
                {},
                {
                  defaultValue:
                    'AI-powered reflections that gently highlight triggers, themes, and gratitudes — without losing your voice.',
                },
              )}
            </li>
            <li>
              {t(
                'about.featurePrivacy',
                {},
                {
                  defaultValue:
                    'End-to-end encryption, a passcode lock, and full CSV export so your reflections stay private and portable.',
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
          >
            {t('about.contactTitle', {}, { defaultValue: 'Talk to us' })}
          </h2>
          <p data-mol-id="about-contact">
            {t(
              'about.contactBody',
              {},
              {
                defaultValue:
                  'Have feedback, found a bug, or want to tell us how journaling has helped? We read every message — reach out any time and a real person will get back to you.',
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
