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
    id: 'exif',
    titleKey: 'about.feature.exif.title',
    titleDefault: 'Gallery-grade EXIF',
    bodyKey: 'about.feature.exif.body',
    bodyDefault:
      'Camera, lens, focal length, aperture, shutter, and ISO are preserved on every upload — searchable, filterable, and never stripped.',
  },
  {
    id: 'albums',
    titleKey: 'about.feature.albums.title',
    titleDefault: 'Albums & curated galleries',
    bodyKey: 'about.feature.albums.body',
    bodyDefault:
      'Organize your work into albums, and follow editorial galleries curated by the community to discover photographers like you read a magazine.',
  },
  {
    id: 'canvas',
    titleKey: 'about.feature.canvas.title',
    titleDefault: 'A canvas, not a feed',
    bodyKey: 'about.feature.canvas.body',
    bodyDefault:
      'Variable-height masonry and generous whitespace let your photographs breathe — no chrome, no ads, no infinite-scroll dopamine loops.',
  },
  {
    id: 'community',
    titleKey: 'about.feature.community.title',
    titleDefault: 'A human community',
    bodyKey: 'about.feature.community.body',
    bodyDefault:
      'Threaded comments, hearted photos, tags, and follows keep the conversation civil-by-default and moderated by real people.',
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
      eyebrow={t('about.eyebrow', {}, { defaultValue: 'About us' })}
      title={t('about.pageTitle', { app: APP_NAME }, { defaultValue: `About ${APP_NAME}` })}
    >
      <div data-mol-id="about-body" className={cm.cn(cm.stack(8))}>
        <p data-mol-id="about-intro" className={cm.cn(cm.prose, 'text-on-surface-variant')}>
          {t(
            'about.intro',
            { app: APP_NAME },
            {
              defaultValue: `${APP_NAME} is a quiet, gallery-grade home for photographers. Share albums with their metadata intact, browse curator-led editorial galleries, and let the photographs do the work — without ads, model training, or attention-stealing UI.`,
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
              { app: APP_NAME },
              {
                defaultValue: `We believe a photograph deserves more than a thumbnail in a feed. ${APP_NAME} gives photographers a calm, gallery-grade place to publish their best work — and gives viewers a place to actually look.`,
              },
            )}
          </p>
        </section>

        <section data-mol-id="about-features" className={cm.cn(cm.stack(4))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
          </h2>
          <ul className={cm.cn(cm.stack(3), 'list-disc pl-6 text-on-surface-variant')}>
            {FEATURES.map((f) => (
              <li key={f.id} data-mol-id={`about-feature-${f.id}`}>
                <span className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface')}>
                  {t(f.titleKey, {}, { defaultValue: f.titleDefault })}
                </span>{' '}
                — {t(f.bodyKey, {}, { defaultValue: f.bodyDefault })}
              </li>
            ))}
          </ul>
        </section>

        <section data-mol-id="about-contact" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.contactTitle', {}, { defaultValue: 'Get in touch' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.contactBody',
              {},
              {
                defaultValue:
                  'Have feedback, found a bug, or want your gallery featured? Reach out from your account settings — every message goes to a real human on the team.',
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
