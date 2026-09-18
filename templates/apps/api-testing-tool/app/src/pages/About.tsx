/**
 * Public About page. Tells visitors what Pylon is, why it exists, and what
 * they get. Wrapped in the same public chrome (Header + Footer via
 * ContentPageShell) as Pricing/Privacy/Terms so brand stays consistent.
 * Phrased as i18n defaults so locales can override.
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
    id: 'collections',
    titleKey: 'about.feature.collections.title',
    titleDefault: 'Collections & environments',
    bodyKey: 'about.feature.collections.body',
    bodyDefault:
      'Organise saved requests into collections and switch between dev, staging, and production with first-class environment variables.',
  },
  {
    id: 'history',
    titleKey: 'about.feature.history.title',
    titleDefault: 'Full request history',
    bodyKey: 'about.feature.history.body',
    bodyDefault:
      'Every request you fire is captured — URL, method, status, latency, and response body — so you can replay, compare, and debug after the fact.',
  },
  {
    id: 'tests',
    titleKey: 'about.feature.tests.title',
    titleDefault: 'Automated tests & monitors',
    bodyKey: 'about.feature.tests.body',
    bodyDefault:
      'Write plain-JavaScript assertions on status, schema, and response time, then schedule them as monitors that watch your APIs around the clock.',
  },
  {
    id: 'mocks',
    titleKey: 'about.feature.mocks.title',
    titleDefault: 'Mock servers',
    bodyKey: 'about.feature.mocks.body',
    bodyDefault:
      'Spin up deterministic mock endpoints from any collection in seconds to unblock front-end work and keep CI runs hermetic.',
  },
  {
    id: 'keyboard',
    titleKey: 'about.feature.keyboard.title',
    titleDefault: 'Keyboard-native workflow',
    bodyKey: 'about.feature.keyboard.body',
    bodyDefault:
      'Every action has a shortcut and a command palette (⌘K), so you can build, send, and inspect requests without leaving the keyboard.',
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
      title={t('about.pageTitle', { app: APP_NAME }, { defaultValue: 'About {{app}}' })}
      subtitle={t(
        'about.intro',
        { app: APP_NAME },
        {
          defaultValue:
            '{{app}} is a fast, keyboard-native API testing workbench for engineers who live in the terminal — Postman-style requests, collections, environments, and history without the bloat.',
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
                  'APIs are the backbone of modern software, but the tools for exercising them are slow, bloated, and mouse-driven. {{app}} exists to give developers a sharp, fast, terminal-grade workbench: fire requests, forge confidence, and ship without leaving the keyboard.',
              },
            )}
          </p>
        </section>

        <section data-mol-id="about-features" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
          </h2>
          <ul className={cm.cn(cm.stack(4))}>
            {FEATURES.map((f) => (
              <li key={f.id} data-mol-id={`about-feature-${f.id}`} className={cm.cn(cm.stack(1))}>
                <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
                  {t(f.titleKey, {}, { defaultValue: f.titleDefault })}
                </h3>
                <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
                  {t(f.bodyKey, {}, { defaultValue: f.bodyDefault })}
                </p>
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
                  'Found a bug, have a feature request, or want to tell us what to build next? Email hello@pylon.dev — every message reaches a real engineer on the team.',
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
