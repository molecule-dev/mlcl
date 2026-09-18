import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AuthBrandHeader } from '../components/AuthBrandHeader.js'
import { Footer } from '../components/Footer.js'

interface Feature {
  id: string
  key: string
  default: string
}

const FEATURES: Feature[] = [
  {
    id: 'labs',
    key: 'about.featureLabs',
    default:
      'Every lab result with its reference range and trend history, so out-of-range values are flagged the moment they land.',
  },
  {
    id: 'medications',
    key: 'about.featureMedications',
    default:
      'A live medication list with dosages, refills, and prescribers — plus a heads-up when combinations need attention.',
  },
  {
    id: 'timeline',
    key: 'about.featureTimeline',
    default:
      'Immunizations, conditions, allergies, vitals, and visit summaries gathered into one clinical-grade timeline.',
  },
  {
    id: 'encryption',
    key: 'about.featureEncryption',
    default:
      'Documents encrypted with AES-256 and an audit trail on every access — your records are never readable on disk.',
  },
  {
    id: 'sharing',
    key: 'about.featureSharing',
    default:
      'Targeted sharing: grant a provider or caregiver read-only access to just one slice, and revoke it at any time.',
  },
  {
    id: 'export',
    key: 'about.featureExport',
    default:
      'Export and reporting tools so you can carry your complete record wherever your care takes you.',
  },
]

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
              defaultValue: `${APP_NAME} is a secure, private home for your complete health story. Labs, medications, immunizations, conditions, and visit history live together in one encrypted place — so you, and only the people you choose, can see the full picture.`,
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
                  'We believe your medical records belong to you, not to a patchwork of provider portals. We bring every result, prescription, and visit together, then let you share precise slices with a doctor or caregiver — and take that access back the moment you want it.',
              },
            )}
          </p>
        </section>

        <section data-mol-id="about-features" className={cm.cn(cm.stack(3))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
          </h2>
          <ul className={cm.cn(cm.stack(2), 'list-disc pl-6 text-on-surface-variant')}>
            {FEATURES.map((f) => (
              <li key={f.id} data-mol-id={`about-feature-${f.id}`} className={cm.prose}>
                {t(f.key, {}, { defaultValue: f.default })}
              </li>
            ))}
          </ul>
        </section>

        <section data-mol-id="about-contact" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.contactTitle', {}, { defaultValue: 'Talk to us' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.contactBody',
              {},
              {
                defaultValue:
                  'Questions, feedback, or help moving your records in? Reach our team from in-app Settings — every message goes to a real person who can help.',
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
