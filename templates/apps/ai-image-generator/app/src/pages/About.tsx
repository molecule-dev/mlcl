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
    id: 'generate',
    titleKey: 'about.feature.generate.title',
    titleDefault: 'Text-to-image generation',
    bodyKey: 'about.feature.generate.body',
    bodyDefault:
      'Describe what you imagine and watch it render. Studio-grade diffusion models turn a prompt into a finished frame in seconds, with full control over aspect ratio, seed, and guidance.',
  },
  {
    id: 'styles',
    titleKey: 'about.feature.styles.title',
    titleDefault: 'Style presets and prompt control',
    bodyKey: 'about.feature.styles.body',
    bodyDefault:
      'Save reusable style presets, build a prompt library, and dial in negative prompts so every render matches your taste — no need to retype the magic words each time.',
  },
  {
    id: 'variations',
    titleKey: 'about.feature.variations.title',
    titleDefault: 'Variations and editing',
    bodyKey: 'about.feature.variations.body',
    bodyDefault:
      'Branch any image into variations, lock a seed to refine a direction, and use the built-in editor to crop, mask, and iterate until the result is exactly right.',
  },
  {
    id: 'collections',
    titleKey: 'about.feature.collections.title',
    titleDefault: 'Gallery and collections',
    bodyKey: 'about.feature.collections.body',
    bodyDefault:
      'Everything you make lands in a personal gallery you can favorite, organize into collections and mood-boards, and share — privately or with the public showcase.',
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
      eyebrow={t('nav.about', {}, { defaultValue: 'About' })}
      title={t('about.pageTitle', { appName: APP_NAME }, { defaultValue: `About ${APP_NAME}` })}
      subtitle={t(
        'about.intro',
        { appName: APP_NAME },
        {
          defaultValue: `${APP_NAME} is an AI image studio that turns your imagination into stunning visuals. Describe a scene, choose a style, and generate, refine, and collect images — all in one place.`,
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
              { appName: APP_NAME },
              {
                defaultValue: `We believe great imagery should be a thought away. ${APP_NAME} pairs powerful generative models with the controls professional creators actually need — style presets, seed locking, variations, and a tidy library — so the tool gets out of the way and the ideas come out.`,
              },
            )}
          </p>
        </section>

        <section data-mol-id="about-features" className={cm.cn(cm.stack(4))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
          </h2>
          <div className={cm.cn('grid gap-4 md:grid-cols-2')}>
            {FEATURES.map((feature) => (
              <article
                key={feature.id}
                data-mol-id={`about-feature-${feature.id}`}
                className={cm.cn(
                  cm.stack(1),
                  cm.sp('p', 5),
                  'rounded-2xl border border-outline-variant/15 bg-surface-container-lowest',
                )}
              >
                <h3
                  className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'), 'text-on-surface')}
                >
                  {t(feature.titleKey, {}, { defaultValue: feature.titleDefault })}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
                  {t(feature.bodyKey, {}, { defaultValue: feature.bodyDefault })}
                </p>
              </article>
            ))}
          </div>
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
                  'Have feedback, hit a snag, or want to tell us what to build next? Reach the team at hello@reverie.app — every message goes to a real person who makes the product.',
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
