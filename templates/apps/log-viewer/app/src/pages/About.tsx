import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

interface Feature {
  id: string
  titleKey: string
  titleDefault: string
  bodyKey: string
  bodyDefault: string
}

const FEATURES: Feature[] = [
  {
    id: 'search',
    titleKey: 'about.feature.search.heading',
    titleDefault: 'Sub-second search',
    bodyKey: 'about.feature.search.body',
    bodyDefault:
      'Run regex, structured filters, and free-text in one query bar across every service, with live tail when you want to watch logs stream in real time.',
  },
  {
    id: 'tracing',
    titleKey: 'about.feature.tracing.heading',
    titleDefault: 'Traces & incidents',
    bodyKey: 'about.feature.tracing.body',
    bodyDefault:
      'Pivot from any log line to the full distributed trace, then open an incident and post updates without leaving the page.',
  },
  {
    id: 'alerts',
    titleKey: 'about.feature.alerts.heading',
    titleDefault: 'Pattern-based alerts',
    bodyKey: 'about.feature.alerts.body',
    bodyDefault:
      'Trigger pages when a stack trace, threshold, or error-rate condition fires, and track which services are degrading at a glance.',
  },
  {
    id: 'saved',
    titleKey: 'about.feature.saved.heading',
    titleDefault: 'Saved searches & streams',
    bodyKey: 'about.feature.saved.body',
    bodyDefault:
      'Save the queries you run during every incident, organise log sources into streams, and share them with your team.',
  },
]

export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <ContentPageShell
      dataMolId="page-about"
      header={<Header />}
      footer={<Footer />}
      eyebrow={t('about.eyebrow', {}, { defaultValue: 'About' })}
      title={t('about.heading', { appName: APP_NAME }, { defaultValue: `About ${APP_NAME}` })}
      subtitle={t('about.tagline', {}, { defaultValue: 'Every signal, instantly traced.' })}
    >
      <div className={cm.cn(cm.stack(8))}>
        <section data-mol-id="about-intro" className={cm.cn(cm.stack(2))}>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.intro',
              { appName: APP_NAME },
              {
                defaultValue:
                  '{{appName}} is a real-time log viewer for engineering teams. Search, trace, and triage logs across every service from one place — structured parsing, distributed tracing, live tail, alerts, and incidents, without stitching together half a dozen tools.',
              },
            )}
          </p>
        </section>

        <section data-mol-id="about-mission" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.missionHeading', {}, { defaultValue: 'Our mission' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.missionBody',
              { appName: APP_NAME },
              {
                defaultValue:
                  'When something breaks at 2am, the answer is already in your logs — the hard part is finding it fast. {{appName}} exists to close the gap between a signal firing and an engineer understanding it, so teams can trace the cause, ship the fix, and move on.',
              },
            )}
          </p>
        </section>

        <section data-mol-id="about-features" className={cm.cn(cm.stack(4))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.whatYouGetHeading', {}, { defaultValue: 'What you get' })}
          </h2>
          <ul className={cm.cn(cm.stack(4))}>
            {FEATURES.map((f) => (
              <li key={f.id} data-mol-id={`about-feature-${f.id}`} className={cm.cn(cm.stack(1))}>
                <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                  {t(f.titleKey, {}, { defaultValue: f.titleDefault })}
                </h3>
                <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
                  {t(f.bodyKey, {}, { defaultValue: f.bodyDefault })}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section data-mol-id="about-contact" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.contactHeading', {}, { defaultValue: 'Talk to us' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.contactBody',
              {},
              {
                defaultValue:
                  'Have feedback, hit a bug, or want a feature? Email hello@signalink.example — every message reaches a real engineer on the team.',
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
