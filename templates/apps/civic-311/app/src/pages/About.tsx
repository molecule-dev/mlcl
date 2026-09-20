/**
 * Public "About" page. App-specific content grounded in what this 311
 * reporter actually does (photo + map-pin reports, duplicate detection,
 * confirmations, watch areas, status workflow). Wrapped in the same
 * public chrome (Header + Footer + ContentPageShell) as the Pricing /
 * Privacy / Terms pages so the brand stays consistent. Every string
 * flows through `t()`.
 *
 * @returns The rendered about page.
 */
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
    id: 'reports',
    titleKey: 'about.featureReports.title',
    titleDefault: 'Photo + map-pin reports',
    bodyKey: 'about.featureReports.body',
    bodyDefault:
      'Report a pothole, out streetlight, graffiti, missed pickup, fallen limb, or parking problem with a photo and a pin on the city grid — the nearest cross-street address fills itself in.',
  },
  {
    id: 'duplicates',
    titleKey: 'about.featureDuplicates.title',
    titleDefault: 'Duplicate detection',
    bodyKey: 'about.featureDuplicates.body',
    bodyDefault:
      'Before a report is filed, open reports of the same kind within five blocks are surfaced — confirm the existing one instead of filing a twin, and the city sees where demand clusters.',
  },
  {
    id: 'confirmations',
    titleKey: 'about.featureConfirmations.title',
    titleDefault: 'Neighbor confirmations',
    bodyKey: 'about.featureConfirmations.body',
    bodyDefault:
      'A one-tap "me too" on someone else\u2019s report adds independent corroboration, so crews arrive knowing how many residents are affected.',
  },
  {
    id: 'workflow',
    titleKey: 'about.featureWorkflow.title',
    titleDefault: 'Status workflow on the record',
    bodyKey: 'about.featureWorkflow.body',
    bodyDefault:
      'Every report moves submitted \u2192 acknowledged \u2192 in review \u2192 resolved or dismissed, with the city\u2019s official response notes and citizen comments on one timeline.',
  },
  {
    id: 'watchAreas',
    titleKey: 'about.featureWatchAreas.title',
    titleDefault: 'Watch areas',
    bodyKey: 'about.featureWatchAreas.body',
    bodyDefault:
      'Save named spots — your block, the school route, the park — and new reports inside them land in your notifications feed, in the app.',
  },
]

export function About() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <ContentPageShell
      dataMolId="page-about"
      header={<Header />}
      footer={<Footer />}
      eyebrow={t('about.eyebrow', {}, { defaultValue: 'About' })}
      title={t('about.title', { app: APP_NAME }, { defaultValue: 'About {{app}}' })}
      subtitle={t(
        'about.intro',
        { app: APP_NAME },
        {
          defaultValue:
            '{{app}} is a 311 civic issue reporter for the City of Riverton — residents report problems with a photo and a map pin, confirm each other\u2019s reports, and follow every fix through the city\u2019s workflow.',
        },
      )}
    >
      <div className={cm.cn(cm.stack(8))}>
        <section data-mol-id="about-mission" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.missionBody',
              { app: APP_NAME },
              {
                defaultValue:
                  'A 311 works when reports are easy to file, hard to duplicate, and impossible to lose. {{app}} keeps residents and city staff on one shared record — from the first photo to the official note that closes it out.',
              },
            )}
          </p>
        </section>

        <section data-mol-id="about-features" className={cm.cn(cm.stack(4))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.whatYouGet', {}, { defaultValue: 'What you get' })}
          </h2>
          <div className={cm.cn(cm.stack(4))}>
            {FEATURES.map((f) => (
              <div key={f.id} data-mol-id={`about-feature-${f.id}`} className={cm.cn(cm.stack(1))}>
                <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
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
              { app: APP_NAME },
              {
                defaultValue:
                  'Questions about {{app}} or feedback on city services? Email hello@{{app}}.example or file a report of kind "other" from the app — every message reaches the 311 desk.',
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
