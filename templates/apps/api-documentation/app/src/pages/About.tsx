import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { AuthBrandHeader } from '../components/AuthBrandHeader.js'
import { LoginFooter } from '../components/LoginFooter.js'

const FEATURES = [
  {
    key: 'openapi',
    defaultTitle: 'OpenAPI-driven reference',
    defaultBody:
      'Drop in your OpenAPI 3 spec and get a navigable, versioned reference — endpoints grouped by tag, parameters, request and response schemas, and per-version changelogs.',
  },
  {
    key: 'tryit',
    defaultTitle: 'Try-it console',
    defaultBody:
      'Send real requests from the browser — pick a method, set headers and a body, choose an environment, and see live responses with status codes and timing.',
  },
  {
    key: 'samples',
    defaultTitle: 'Code samples & SDK matrix',
    defaultBody:
      'Copy-paste-ready samples in curl, Node, Python, Go, Ruby, and PHP, plus an SDK matrix with install commands — always kept in sync with the spec.',
  },
  {
    key: 'ops',
    defaultTitle: 'Changelog, status & webhooks',
    defaultBody:
      'Versioned release notes, a public uptime page, and webhook subscriptions so your developers hear about breaking changes before they ship.',
  },
  {
    key: 'keys',
    defaultTitle: 'API keys & teams',
    defaultBody:
      'Issue and revoke scoped API keys, track last-used activity, and invite teammates with roles so your whole team manages the docs together.',
  },
] as const

/**
 * Public About page for the API documentation app.
 *
 * @returns The rendered About page wrapped in the app's public chrome.
 */
export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <ContentPageShell
      dataMolId="page-about"
      header={<AuthBrandHeader />}
      footer={<LoginFooter />}
      eyebrow={t('about.eyebrow', {}, { defaultValue: 'About' })}
      title={t('about.title', { app: APP_NAME }, { defaultValue: 'About {{app}}' })}
      subtitle={t('about.tagline', {}, { defaultValue: APP_TAGLINE })}
    >
      <div className={cm.cn(cm.stack(8))}>
        <p data-mol-id="about-intro" className={cm.cn(cm.prose, 'text-on-surface-variant')}>
          {t(
            'about.intro',
            { app: APP_NAME },
            {
              defaultValue:
                '{{app}} turns an OpenAPI spec into beautiful, navigable API documentation — a try-it console, code samples in six languages, an SDK matrix, a changelog, and a status page. It is the home developers visit to understand, test, and integrate your API.',
            },
          )}
        </p>

        <section data-mol-id="about-mission" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
            {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.missionBody',
              {},
              {
                defaultValue:
                  'Great APIs deserve docs that are accurate, testable, and a pleasure to read. We believe documentation should be generated from the source of truth — your spec — so it never drifts, and that every reader should be able to make a real request without leaving the page.',
              },
            )}
          </p>
        </section>

        <section data-mol-id="about-features" className={cm.cn(cm.stack(4))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
            {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
          </h2>
          <ul className={cm.cn(cm.stack(4))}>
            {FEATURES.map((f) => (
              <li key={f.key} data-mol-id={`about-feature-${f.key}`} className={cm.cn(cm.stack(1))}>
                <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
                  {t(`about.feature.${f.key}.title`, {}, { defaultValue: f.defaultTitle })}
                </h3>
                <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
                  {t(`about.feature.${f.key}.body`, {}, { defaultValue: f.defaultBody })}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section data-mol-id="about-contact" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
            {t('about.contactTitle', {}, { defaultValue: 'Get in touch' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.contactBody',
              { app: APP_NAME },
              {
                defaultValue:
                  'Questions, feedback, or want a demo of {{app}} for your team? Reach out from your account once you sign in — every message reaches a real human on our team.',
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
