import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

interface AboutFeature {
  id: string
  titleKey: string
  titleDefault: string
  bodyKey: string
  bodyDefault: string
}

const FEATURES: AboutFeature[] = [
  {
    id: 'vaults',
    titleKey: 'about.feature.vaults.title',
    titleDefault: 'Envelope-encrypted vaults',
    bodyKey: 'about.feature.vaults.body',
    bodyDefault:
      'Per-vault data keys wrapped by an AES-256 master. The server never sees your plaintext, so API keys, database URLs, and signing secrets stay sealed even from us.',
  },
  {
    id: 'rotations',
    titleKey: 'about.feature.rotations.title',
    titleDefault: 'Scheduled, signed rotations',
    bodyKey: 'about.feature.rotations.body',
    bodyDefault:
      'Rotate secrets per environment on a schedule, ship signed webhooks to your CI, and watch every change land in the audit log automatically.',
  },
  {
    id: 'audit',
    titleKey: 'about.feature.audit.title',
    titleDefault: 'An audit trail you will read',
    bodyKey: 'about.feature.audit.body',
    bodyDefault:
      'Who, when, from where, and why — every read, write, rotate, and revoke is searchable, so "who has access?" becomes a single query instead of a fire drill.',
  },
  {
    id: 'access',
    titleKey: 'about.feature.access.title',
    titleDefault: 'Granular access control',
    bodyKey: 'about.feature.access.body',
    bodyDefault:
      'Path-scoped policies, environment limits, and team roles keep the blast radius small — give people exactly the secrets they need and nothing more.',
  },
  {
    id: 'integrations',
    titleKey: 'about.feature.integrations.title',
    titleDefault: 'Integrations and API tokens',
    bodyKey: 'about.feature.integrations.body',
    bodyDefault:
      'Wire vaults into your pipelines with scoped API tokens and first-class integrations, so the secure path is also the fast path.',
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
      title={t('about.pageTitle', { app: APP_NAME }, { defaultValue: `About ${APP_NAME}` })}
      subtitle={t('about.tagline', {}, { defaultValue: 'Secrets die in the open.' })}
    >
      <div className={cm.cn(cm.stack(8))}>
        <p data-mol-id="about-intro" className={cm.cn(cm.prose, 'text-on-surface-variant')}>
          {t(
            'about.intro',
            { app: APP_NAME },
            {
              defaultValue: `${APP_NAME} is a vault built for the people who ship. Store API keys, database URLs, and signing secrets behind envelope encryption, rotate them on a schedule, and prove exactly who touched what — all from one place your security team will actually trust.`,
            },
          )}
        </p>

        <section data-mol-id="about-mission" className={cm.cn(cm.stack(2))}>
          <h2
            className={cm.cn(
              cm.textSize('xl'),
              cm.fontWeight('bold'),
              'font-display tracking-tight',
            )}
          >
            {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.missionBody',
              { app: APP_NAME },
              {
                defaultValue: `Secrets leak when they live in plaintext .env files, shared spreadsheets, and chat threads. We built ${APP_NAME} so the safe path is the fast path: encrypted storage, signed rotations, and a searchable trail that makes audits boring in the best possible way.`,
              },
            )}
          </p>
        </section>

        <section data-mol-id="about-features" className={cm.cn(cm.stack(4))}>
          <h2
            className={cm.cn(
              cm.textSize('xl'),
              cm.fontWeight('bold'),
              'font-display tracking-tight',
            )}
          >
            {t('about.whatYouGet', {}, { defaultValue: 'What you get' })}
          </h2>
          <ul className={cm.cn(cm.stack(4))}>
            {FEATURES.map((feature) => (
              <li key={feature.id} className={cm.cn(cm.stack(1))}>
                <h3 className={cm.cn(cm.fontWeight('semibold'), 'font-headline text-text')}>
                  {t(feature.titleKey, {}, { defaultValue: feature.titleDefault })}
                </h3>
                <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
                  {t(feature.bodyKey, {}, { defaultValue: feature.bodyDefault })}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section data-mol-id="about-contact" className={cm.cn(cm.stack(2))}>
          <h2
            className={cm.cn(
              cm.textSize('xl'),
              cm.fontWeight('bold'),
              'font-display tracking-tight',
            )}
          >
            {t('about.contactTitle', {}, { defaultValue: 'Talk to us' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.contactBody',
              {},
              {
                defaultValue:
                  'Questions, a security disclosure, or feedback? Reach the team from your account — every message goes to a real human who works on the vault.',
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
