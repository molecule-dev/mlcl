import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

const FEATURES = [
  {
    key: 'rooms',
    defaultValue:
      'Every light, thermostat, and sensor grouped by the room it actually lives in — control a whole space with a tap.',
  },
  {
    key: 'scenes',
    defaultValue:
      'Scenes like Movie Night, Morning, and Away that set the mood instantly, plus automations that run the house for you — no YAML required.',
  },
  {
    key: 'energy',
    defaultValue:
      'Live wattage, daily kWh, and monthly cost, color-coded so the spikes find you before the bill does.',
  },
  {
    key: 'security',
    defaultValue:
      'Arm and disarm modes, a live activity feed, and an interactive floorplan that shows your home at a glance.',
  },
] as const

export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <ContentPageShell
      dataMolId="page-about"
      containerSize="lg"
      header={<Header />}
      footer={<Footer />}
      eyebrow={t('about.eyebrow', {}, { defaultValue: 'About' })}
      title={t('about.pageTitle', { app: APP_NAME }, { defaultValue: 'About {{app}}' })}
    >
      <div className={cm.cn(cm.stack(4))}>
        <p data-mol-id="about-intro" className={cm.cn(cm.prose, 'text-on-surface-variant')}>
          {t(
            'about.intro',
            { app: APP_NAME },
            {
              defaultValue:
                '{{app}} is a smart home dashboard for lights, climate, security, and automations — a calm, self-hosted-feeling hub that pulls every device in your home into one place: the wall tablet, the phone, and the corner of your eye.',
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
              defaultValue:
                'A smart home should feel effortless, not like a second job. We believe controlling your home should be private, fast, and genuinely calming — every room, scene, and automation a glance away, with the live realtime feel of a hub built for everyday life.',
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
        <ul data-mol-id="about-features" className={cm.cn(cm.stack(2), 'list-disc pl-6')}>
          {FEATURES.map((f) => (
            <li key={f.key} className={cm.cn('text-on-surface-variant')}>
              {t(`about.feature.${f.key}`, {}, { defaultValue: f.defaultValue })}
            </li>
          ))}
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
                'Have feedback, found a bug, or want a device supported? Reach us any time from Settings — every message goes to a real human on the team.',
            },
          )}
        </p>
      </div>
    </ContentPageShell>
  )
}

export default About
export { About as AboutPage }
