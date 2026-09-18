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
    id: 'keyframes',
    titleKey: 'about.featureKeyframes',
    titleDefault: 'Keyframe timeline',
    bodyKey: 'about.featureKeyframesBody',
    bodyDefault:
      'A frame-accurate timeline with diamond keyframes, drag-friendly hit targets, and a precise playhead so you can author every micro-interaction without leaving the editor.',
  },
  {
    id: 'easing',
    titleKey: 'about.featureEasing',
    titleDefault: 'Easing curves',
    bodyKey: 'about.featureEasingBody',
    bodyDefault:
      'Hand-tuned bezier presets and a live curve editor let you dial in exactly the feel you want — snappy, smooth, or spring-loaded — for every beat of your animation.',
  },
  {
    id: 'states',
    titleKey: 'about.featureStates',
    titleDefault: 'State machines',
    bodyKey: 'about.featureStatesBody',
    bodyDefault:
      'Compose Idle, Hover, Pressed, and custom states into a node graph. Triggers and transitions render exactly as your users will experience them.',
  },
  {
    id: 'layers',
    titleKey: 'about.featureLayers',
    titleDefault: 'Layers and assets',
    bodyKey: 'about.featureLayersBody',
    bodyDefault:
      'Organize your scene with nested, lockable layers and an asset library backed by fast uploads, so complex compositions stay manageable.',
  },
  {
    id: 'export',
    titleKey: 'about.featureExport',
    titleDefault: 'Export anywhere',
    bodyKey: 'about.featureExportBody',
    bodyDefault:
      'Render and export your motion to the web at the quality you choose, share preview links, and track every export from one render queue.',
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
          defaultValue: `${APP_NAME} is a creative animation workbench that brings motion to life right in your browser. Compose keyframes, curate easing, wire state machines, and ship polished motion to the web — no native tooling required.`,
        },
      )}
    >
      <div className={cm.cn(cm.stack(10))}>
        <section data-mol-id="about-mission" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.missionBody',
              { appName: APP_NAME },
              {
                defaultValue: `Great motion design should be precise and playful — and it shouldn't require a heavyweight desktop suite. ${APP_NAME} gives designers and developers a fast, frame-accurate workbench for keyframes, easing, and interactive states, so beautiful animation is one project away.`,
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
                <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
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
                defaultValue: `Have feedback, found a bug, or want to tell us what you're building with ${APP_NAME}? Reach out from your account settings — every message goes to a real person on the team.`,
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
