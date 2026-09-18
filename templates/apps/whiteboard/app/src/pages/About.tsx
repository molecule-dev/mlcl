import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

const FEATURES: { id: string; key: string; def: string }[] = [
  {
    id: 'canvas',
    key: 'about.featureCanvas',
    def: 'An infinite, pannable canvas with shapes, sticky notes, freehand drawing, connectors, and frames — your ideas never need a margin.',
  },
  {
    id: 'collaboration',
    key: 'about.featureCollaboration',
    def: 'Real-time multiplayer cursors and presence so your whole team thinks together live, with granular share and lock controls per element.',
  },
  {
    id: 'templates',
    key: 'about.featureTemplates',
    def: 'Workshop-ready templates for brainstorms, retros, mind-maps, and journey maps — plus your own reusable boards to start every session fast.',
  },
  {
    id: 'history',
    key: 'about.featureHistory',
    def: 'Time-travel version history and a built-in presentation mode to walk stakeholders through a board, then roll back to any past snapshot.',
  },
]

/**
 * Public About page describing the product, mission, and key capabilities.
 *
 * @returns The rendered About page wrapped in the app's public chrome.
 */
export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <ContentPageShell
      dataMolId="page-about"
      header={<Header />}
      footer={<Footer />}
      eyebrow={t('nav.about', {}, { defaultValue: 'About' })}
      title={t('about.pageTitle', { appName: APP_NAME }, { defaultValue: `About ${APP_NAME}` })}
    >
      <div className={cm.cn(cm.stack(8))}>
        <p
          data-mol-id="about-intro"
          className={cm.cn(cm.prose, cm.textSize('lg'), 'text-on-surface-variant leading-relaxed')}
        >
          {t(
            'about.intro',
            { appName: APP_NAME },
            {
              defaultValue:
                '{{appName}} is a collaborative infinite canvas for design teams, workshop facilitators, and educators. Drop sticky notes, sketch shapes, draw freehand, and watch teammates think alongside you in real time — all in one place where messy, generative ideas can finally converge.',
            },
          )}
        </p>

        <section data-mol-id="about-mission" className={cm.cn(cm.stack(2))}>
          <h2
            className={cm.cn(
              cm.textSize('xl'),
              cm.fontWeight('bold'),
              'tracking-tight text-on-surface',
            )}
          >
            {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant leading-relaxed')}>
            {t(
              'about.missionBody',
              { appName: APP_NAME },
              {
                defaultValue:
                  'Great thinking is rarely tidy. {{appName}} exists to give teams a fast, low-friction surface where ideas can be captured the moment they arrive and shaped together until they make sense — without the lag, the lost work, or the rigid tools that kill momentum.',
              },
            )}
          </p>
        </section>

        <section data-mol-id="about-features" className={cm.cn(cm.stack(3))}>
          <h2
            className={cm.cn(
              cm.textSize('xl'),
              cm.fontWeight('bold'),
              'tracking-tight text-on-surface',
            )}
          >
            {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
          </h2>
          <ul className={cm.cn(cm.stack(2), cm.prose, 'list-disc pl-6 text-on-surface-variant')}>
            {FEATURES.map((f) => (
              <li key={f.id}>{t(f.key, {}, { defaultValue: f.def })}</li>
            ))}
          </ul>
        </section>

        <section data-mol-id="about-contact" className={cm.cn(cm.stack(2))}>
          <h2
            className={cm.cn(
              cm.textSize('xl'),
              cm.fontWeight('bold'),
              'tracking-tight text-on-surface',
            )}
          >
            {t('about.contactTitle', {}, { defaultValue: 'Talk to us' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant leading-relaxed')}>
            {t(
              'about.contactBody',
              { appName: APP_NAME },
              {
                defaultValue:
                  'Have feedback, hit a bug, or want a feature? We read every message — reach the {{appName}} team from your account settings and a real person will get back to you.',
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
