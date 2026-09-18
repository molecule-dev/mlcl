import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AuthBrandHeader } from '../components/AuthBrandHeader.js'
import { Footer } from '../components/Footer.js'

const FEATURES = [
  {
    key: 'encryption',
    defaultValue:
      'End-to-end encryption is on by default. Messages, media, and calls are sealed with keys that only you and your contacts hold — never readable on our servers.',
  },
  {
    key: 'conversations',
    defaultValue:
      '1:1 and group conversations with read receipts, typing indicators, reactions, and rich media sharing — the messaging experience you already know, made private.',
  },
  {
    key: 'ephemeral',
    defaultValue:
      'Disappearing messages with per-chat timers, plus contact verification through safety numbers so you always know who you are really talking to.',
  },
  {
    key: 'plans',
    defaultValue:
      'Free forever for personal use. Pro and Team plans add higher limits, advanced features, data export, and longer retention for groups that need more.',
  },
] as const

export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <ContentPageShell
      dataMolId="page-about"
      containerSize="lg"
      header={<AuthBrandHeader />}
      footer={<Footer />}
      eyebrow={t('about.eyebrow', {}, { defaultValue: 'About' })}
      title={t('about.pageTitle', { appName: APP_NAME }, { defaultValue: `About ${APP_NAME}` })}
    >
      <div className={cm.stack(8)}>
        <p data-mol-id="about-intro" className={cm.cn(cm.prose, 'text-on-surface-variant')}>
          {t(
            'about.intro',
            { appName: APP_NAME },
            {
              defaultValue: `${APP_NAME} is an end-to-end encrypted messenger for people who want private conversations without compromise — direct messages, group chats, calls, and ephemeral threads that vanish on a timer.`,
            },
          )}
        </p>

        <section data-mol-id="about-mission" className={cm.stack(2)}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.missionBody',
              {},
              {
                defaultValue:
                  'We believe private communication is a basic right, not a premium add-on. No ads, no tracking, no harvesting your conversations to sell. Our clients are open source and audited, and encryption is never something you have to turn on.',
              },
            )}
          </p>
        </section>

        <section data-mol-id="about-features" className={cm.stack(3)}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
          </h2>
          <ul className={cm.cn(cm.stack(2), 'list-disc pl-6')}>
            {FEATURES.map((f) => (
              <li key={f.key} className={'text-on-surface-variant'}>
                {t(`about.feature.${f.key}`, {}, { defaultValue: f.defaultValue })}
              </li>
            ))}
          </ul>
        </section>

        <section data-mol-id="about-contact" className={cm.stack(2)}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.contactTitle', {}, { defaultValue: 'Talk to us' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.contactBody',
              {},
              {
                defaultValue:
                  'Questions, bug reports, or a security disclosure? Reach the team from your Settings page — every message lands with a real human who reads it.',
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
