import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AuthBrandHeader } from '../components/AuthBrandHeader.js'
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
    id: 'discover',
    titleKey: 'about.feature.discover.title',
    titleDefault: 'Discovery that respects your time',
    bodyKey: 'about.feature.discover.body',
    bodyDefault:
      'Editor-curated lists, human-tagged genres, and a for-you feed that surfaces shows worth your attention — without the "podcast about podcasts" loops.',
  },
  {
    id: 'transcripts',
    titleKey: 'about.feature.transcripts.title',
    titleDefault: 'Transcripts on every episode',
    bodyKey: 'about.feature.transcripts.body',
    bodyDefault:
      'Auto-generated, searchable transcripts let you read along, find the moment you remember, and jump straight to it with a tap.',
  },
  {
    id: 'chapters',
    titleKey: 'about.feature.chapters.title',
    titleDefault: 'Chapter navigation',
    bodyKey: 'about.feature.chapters.body',
    bodyDefault:
      'Skip to the segment you actually want. Long shows become approachable when every chapter is one tap away.',
  },
  {
    id: 'sync',
    titleKey: 'about.feature.sync.title',
    titleDefault: 'Position synced across devices',
    bodyKey: 'about.feature.sync.body',
    bodyDefault:
      'Start on your phone, finish on your laptop. Your place, your queue, and your subscriptions stay in sync to the second.',
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
      title={t('about.pageTitle', { appName: APP_NAME }, { defaultValue: `About ${APP_NAME}` })}
      subtitle={t(
        'about.tagline',
        { appName: APP_NAME },
        { defaultValue: `${APP_NAME} is the podcast app for people who actually listen.` },
      )}
    >
      <div className={cm.stack(8)}>
        <p data-mol-id="about-intro" className={cm.cn(cm.prose, 'text-on-surface-variant')}>
          {t(
            'about.intro',
            { appName: APP_NAME },
            {
              defaultValue: `${APP_NAME} brings four million shows together with transcripts on every episode and chapter navigation that respects your time. Discover something new, subscribe to the voices you trust, and pick up exactly where you left off — on any device.`,
            },
          )}
        </p>

        <section data-mol-id="about-mission" className={cm.stack(2)}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
            {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.missionBody',
              {},
              {
                defaultValue:
                  'We believe listening should be calm, searchable, and ad-free. So we built a player around the things that matter to real listeners — transcripts, chapters, and cross-device sync — and a model where you subscribe to support the shows you love, not to escape interruptions.',
              },
            )}
          </p>
        </section>

        <section data-mol-id="about-features" className={cm.stack(4)}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
            {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
          </h2>
          <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 sm:grid-cols-2')}>
            {FEATURES.map((f) => (
              <div
                key={f.id}
                data-mol-id={`about-feature-${f.id}`}
                className={cm.cn(
                  cm.sp('p', 5),
                  'bg-surface-container-low rounded-xl border border-outline-variant/40',
                  cm.stack(2),
                )}
              >
                <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
                  {t(f.titleKey, {}, { defaultValue: f.titleDefault })}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t(f.bodyKey, {}, { defaultValue: f.bodyDefault })}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section data-mol-id="about-contact" className={cm.stack(2)}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
            {t('about.contactTitle', {}, { defaultValue: 'Get in touch' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.contactBody',
              { appName: APP_NAME },
              {
                defaultValue: `Have feedback, found a bug, or run a show you want on ${APP_NAME}? We read every message — reach out from your account settings and a real person on the team will get back to you.`,
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
