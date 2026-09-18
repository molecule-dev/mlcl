import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

interface Feature {
  id: string
  key: string
  default: string
}

const FEATURES: Feature[] = [
  {
    id: 'multiplayer',
    key: 'about.feature.multiplayer',
    default:
      'A real-time multiplayer canvas with live cursors and presence, so your whole team can design the same file at once.',
  },
  {
    id: 'layers',
    key: 'about.feature.layers',
    default:
      'Vector shapes, text, and images organized in a full layers panel with reordering, locking, and per-layer opacity.',
  },
  {
    id: 'library',
    key: 'about.feature.library',
    default:
      'A shared library and design tokens that stay in sync across every project in your workspace — change once, ripple everywhere.',
  },
  {
    id: 'search',
    key: 'about.feature.search',
    default:
      'Instant search across projects, templates, and assets so nothing you have made gets lost.',
  },
  {
    id: 'export',
    key: 'about.feature.export',
    default:
      'One-click export to production-ready images at the format, scale, and quality your handoff needs.',
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
      title={t('about.pageTitle', {}, { defaultValue: `About ${APP_NAME}` })}
    >
      <div className={cm.cn(cm.stack(8))}>
        <p
          data-mol-id="about-intro"
          className={cm.cn(cm.prose, cm.textSize('lg'), 'text-on-surface-variant')}
        >
          {t(
            'about.intro',
            {},
            {
              defaultValue: `${APP_NAME} is the multiplayer design canvas for product teams that ship. Draw with vector shapes, organize work in layers, drop in text and images, and export production-ready assets — all on an infinite canvas your whole team can edit at the same time.`,
            },
          )}
        </p>

        <section className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'text-on-surface')}>
            {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
          </h2>
          <p data-mol-id="about-mission" className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.missionBody',
              {},
              {
                defaultValue: `We believe great products are designed together, in the open. ${APP_NAME} brings real-time collaboration, a shared design system, and developer-ready handoff into one fast workspace — so the distance between an idea and a shipped screen all but disappears.`,
              },
            )}
          </p>
        </section>

        <section className={cm.cn(cm.stack(4))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'text-on-surface')}>
            {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
          </h2>
          <ul data-mol-id="about-features" className={cm.cn(cm.stack(2), 'list-disc pl-6')}>
            {FEATURES.map((f) => (
              <li key={f.id} className={cm.cn(cm.prose, 'text-on-surface-variant')}>
                {t(f.key, {}, { defaultValue: f.default })}
              </li>
            ))}
          </ul>
        </section>

        <section className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'text-on-surface')}>
            {t('about.contactTitle', {}, { defaultValue: 'Talk to us' })}
          </h2>
          <p data-mol-id="about-contact" className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.contactBody',
              {},
              {
                defaultValue:
                  'Have feedback, found a bug, or want a demo for your team? Reach us from the in-app help menu — every message goes to a real person on the team.',
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
