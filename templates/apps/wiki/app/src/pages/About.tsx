import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <ContentPageShell
      dataMolId="page-about"
      header={<Header />}
      footer={<Footer />}
      eyebrow={t('about.eyebrow', {}, { defaultValue: 'About' })}
      title={t('about.pageTitle', { name: APP_NAME }, { defaultValue: `About ${APP_NAME}` })}
      subtitle={t('about.tagline', { tagline: APP_TAGLINE }, { defaultValue: APP_TAGLINE })}
    >
      <div className={cm.cn(cm.prose, cm.stack(4))}>
        <p data-mol-id="about-intro" className={cm.cn('text-on-surface-variant')}>
          {t(
            'about.intro',
            { name: APP_NAME },
            {
              defaultValue: `${APP_NAME} is a calm, editorial wiki and knowledge base for teams that read deeply. Versioned pages, AI-summarised long reads, and a page tree that finally feels like furniture, not paperwork — so your team's knowledge compounds instead of scattering across chat threads and lost docs.`,
            },
          )}
        </p>

        <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), cm.sp('mt', 8))}>
          {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
        </h2>
        <p data-mol-id="about-mission" className={cm.cn('text-on-surface-variant')}>
          {t(
            'about.missionBody',
            {},
            {
              defaultValue:
                'We believe a team should be able to write something down once and trust it to stay findable, current, and credited. No dark patterns, no infinite-scroll bait — just a quiet, well-organised home for the knowledge your people build every day.',
            },
          )}
        </p>

        <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), cm.sp('mt', 8))}>
          {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
        </h2>
        <ul data-mol-id="about-features" className={cm.cn(cm.stack(2), 'list-disc pl-6')}>
          <li>
            {t(
              'about.featureEditor',
              {},
              {
                defaultValue:
                  'A focused Markdown editor with live-split preview, slash commands, and AI summaries on demand for the long reads.',
              },
            )}
          </li>
          <li>
            {t(
              'about.featureVersioning',
              {},
              {
                defaultValue:
                  'Every save is a version — restore any draft from a side-by-side timeline that never loses a paragraph.',
              },
            )}
          </li>
          <li>
            {t(
              'about.featureTree',
              {},
              {
                defaultValue:
                  'A persistent page atlas per space: drag to reorder, search to leap, breadcrumbs to stay grounded.',
              },
            )}
          </li>
          <li>
            {t(
              'about.featurePermissions',
              {},
              {
                defaultValue:
                  'Spaces with granular roles and permissions, plus full-text search so the right reader always finds the right page.',
              },
            )}
          </li>
        </ul>

        <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), cm.sp('mt', 8))}>
          {t('about.contactTitle', {}, { defaultValue: 'Talk to us' })}
        </h2>
        <p data-mol-id="about-contact" className={cm.cn('text-on-surface-variant')}>
          {t(
            'about.contactBody',
            { name: APP_NAME },
            {
              defaultValue: `Have feedback, found a bug, or want a workspace migrated into ${APP_NAME}? Reach the team from your workspace settings — every message goes to a real human.`,
            },
          )}
        </p>
      </div>
    </ContentPageShell>
  )
}

export default About
export { About as AboutPage }
