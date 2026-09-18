import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

interface Feature {
  key: string
  titleDefault: string
  bodyDefault: string
}

const FEATURES: Feature[] = [
  {
    key: 'aiDrafting',
    titleDefault: 'AI drafting that respects your voice',
    bodyDefault:
      'Generate long-form drafts, outlines, and summaries with Claude and GPT, then accept or refine inline suggestions sentence by sentence. The AI drafts beside you — never instead of you.',
  },
  {
    key: 'editor',
    titleDefault: 'A distraction-free editor',
    bodyDefault:
      'A focused rich-text canvas with autosave, version history, and document management so every draft, template, and revision stays organized in one place.',
  },
  {
    key: 'seo',
    titleDefault: 'SEO and readability scoring',
    bodyDefault:
      'A single readability gauge with keyword density and meta-description hints — actionable guidance in plain English instead of a wall of red flags.',
  },
  {
    key: 'imagery',
    titleDefault: 'On-brand image generation',
    bodyDefault:
      'Create illustrations and hero images for any piece with built-in AI image generation, stored alongside the documents they belong to.',
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
      title={t('about.pageTitle', { app: APP_NAME }, { defaultValue: 'About {{app}}' })}
      subtitle={t(
        'about.intro',
        { app: APP_NAME },
        {
          defaultValue:
            '{{app}} is an AI writing studio for writers who care deeply about their prose. It pairs long-form AI generation with a calm editor, SEO scoring, and image generation so you can take a piece from blank page to published — without ever losing your voice.',
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
                  'We believe AI should draft beside you, never instead of you. {{app}} keeps suggestions visibly distinct from your own words, leaves you the owner of every document you create, and gets the tooling out of the way of the writing.',
              },
            )}
          </p>
        </section>

        <section data-mol-id="about-features" className={cm.cn(cm.stack(4))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
          </h2>
          <ul className={cm.cn(cm.stack(4))}>
            {FEATURES.map((f) => (
              <li key={f.key} data-mol-id={`about-feature-${f.key}`} className={cm.cn(cm.stack(1))}>
                <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
                  {t(`about.feature.${f.key}.title`, {}, { defaultValue: f.titleDefault })}
                </h3>
                <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
                  {t(`about.feature.${f.key}.body`, {}, { defaultValue: f.bodyDefault })}
                </p>
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
                  'Have feedback, found a bug, or want a feature? Reach out from your account settings — every message goes to a real person on the team.',
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
