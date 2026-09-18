import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'

interface Feature {
  id: string
  titleKey: string
  titleDefault: string
  bodyKey: string
  bodyDefault: string
}

const FEATURES: Feature[] = [
  {
    id: 'visits',
    titleKey: 'about.feature.visits.title',
    titleDefault: 'Virtual visits, on your schedule',
    bodyKey: 'about.feature.visits.body',
    bodyDefault:
      'Connect with a board-certified clinician by secure video in minutes — no scheduling marathons, no transit, no waiting room.',
  },
  {
    id: 'records',
    titleKey: 'about.feature.records.title',
    titleDefault: 'Your records, in one timeline',
    bodyKey: 'about.feature.records.body',
    bodyDefault:
      'Lab results, visit notes, vitals, and prescriptions are merged into a single chronological record you actually own and can export.',
  },
  {
    id: 'prescriptions',
    titleKey: 'about.feature.prescriptions.title',
    titleDefault: 'Prescriptions sent same-day',
    bodyKey: 'about.feature.prescriptions.body',
    bodyDefault:
      'E-prescriptions go straight to the pharmacy of your choice, and refills resolve in under a minute from your dashboard.',
  },
  {
    id: 'continuity',
    titleKey: 'about.feature.continuity.title',
    titleDefault: 'Continuity of care',
    bodyKey: 'about.feature.continuity.body',
    bodyDefault:
      'Build a longitudinal relationship with your provider. They see your full history, so nothing has to be repeated at every visit.',
  },
]

export function About() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <ContentPageShell
      dataMolId="page-about"
      footer={<Footer />}
      eyebrow={t('about.eyebrow', {}, { defaultValue: 'About us' })}
      title={t('about.pageTitle', { appName: APP_NAME }, { defaultValue: 'About {{appName}}' })}
    >
      <p
        data-mol-id="about-intro"
        className={cm.cn(cm.textSize('base'), cm.sp('mb', 8), 'font-body text-on-surface-variant')}
      >
        {t(
          'about.intro',
          { appName: APP_NAME },
          {
            defaultValue:
              '{{appName}} is a telemedicine platform that brings primary, behavioral, and specialty care to wherever you are. Book a visit, talk to a clinician over secure video, and keep every prescription, record, and appointment in one calm place.',
          },
        )}
      </p>

      <div className={cm.cn(cm.stack(8))}>
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
                  'Care without the commute. We believe quality healthcare should be measured in minutes, not weeks — accessible from home, transparent in price, and built around a real relationship with your provider.',
              },
            )}
          </p>
        </section>

        <section data-mol-id="about-features" className={cm.cn(cm.stack(4))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
          </h2>
          <div className={cm.cn(cm.stack(6))}>
            {FEATURES.map((f) => (
              <div key={f.id} data-mol-id={`about-feature-${f.id}`} className={cm.cn(cm.stack(1))}>
                <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'))}>
                  {t(f.titleKey, {}, { defaultValue: f.titleDefault })}
                </h3>
                <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
                  {t(f.bodyKey, {}, { defaultValue: f.bodyDefault })}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section data-mol-id="about-contact" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.contactTitle', {}, { defaultValue: 'Get in touch' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.contactBody',
              { appName: APP_NAME },
              {
                defaultValue:
                  'Questions about {{appName}}, your care, or how the platform works? Email our team at support@solace.health — a real person responds within one business day. For a medical emergency, call 911.',
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
