import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
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
    id: 'fingerprint',
    titleKey: 'about.feature.fingerprint.title',
    titleDefault: 'Smart fingerprinting',
    bodyKey: 'about.feature.fingerprint.body',
    bodyDefault:
      'Stack-aware grouping rolls a million raw events into a handful of issues, so on-call engineers triage signal instead of noise.',
  },
  {
    id: 'context',
    titleKey: 'about.feature.context.title',
    titleDefault: 'Context that matters',
    bodyKey: 'about.feature.context.body',
    bodyDefault:
      'Every event ships with the full stack trace, breadcrumbs, request body, release SHA, and environment — the details you need to reproduce a bug fast.',
  },
  {
    id: 'releases',
    titleKey: 'about.feature.releases.title',
    titleDefault: 'Release tracking',
    bodyKey: 'about.feature.releases.body',
    bodyDefault:
      'See exactly which deploy introduced a regression, compare releases side by side, and roll back with confidence.',
  },
  {
    id: 'alerts',
    titleKey: 'about.feature.alerts.title',
    titleDefault: 'Alert rules that fit',
    bodyKey: 'about.feature.alerts.body',
    bodyDefault:
      'Threshold, regression, and anomaly rules route to the right channel — without paging the whole team for noise.',
  },
  {
    id: 'performance',
    titleKey: 'about.feature.performance.title',
    titleDefault: 'Performance + discovery',
    bodyKey: 'about.feature.performance.body',
    bodyDefault:
      'Transaction traces and an ad-hoc Discover query builder let you slice errors and latency across projects, environments, and releases.',
  },
]

/**
 * Public "About" page describing what {@link APP_NAME} (Faultline) is and the
 * error-tracking capabilities a new account gets. Wrapped in the app's shared
 * public chrome ({@link ContentPageShell} + {@link Footer}) so the brand stays
 * consistent with Pricing and the legal pages.
 *
 * @returns The rendered About page.
 */
export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <ContentPageShell
      dataMolId="page-about"
      footer={<Footer />}
      eyebrow={t('about.eyebrow', {}, { defaultValue: 'About' })}
      title={t('about.pageTitle', { app: APP_NAME }, { defaultValue: `About ${APP_NAME}` })}
      subtitle={t(
        'about.subtitle',
        {},
        { defaultValue: 'Catch what breaks — before your users do.' },
      )}
    >
      <div className={cm.cn(cm.stack(8))}>
        <section data-mol-id="about-intro" className={cm.cn(cm.stack(3))}>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.intro',
              { app: APP_NAME },
              {
                defaultValue: `${APP_NAME} is an error-tracking platform for engineering teams who ship fast. It captures every exception with its full stack trace, breadcrumbs, request context, release, and environment — then groups them into issues you can actually act on, the way Sentry-style triage should work.`,
              },
            )}
          </p>
        </section>

        <section data-mol-id="about-mission" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.missionBody',
              {},
              {
                defaultValue:
                  'Production breaks. We believe the time between an error and a fix should be measured in minutes, not days — so we built a tool that surfaces the issues that matter, blames the right release, and pages the right person, and nothing more.',
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
              <li key={f.id} data-mol-id={`about-feature-${f.id}`} className={cm.cn(cm.stack(1))}>
                <span className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface')}>
                  {t(f.titleKey, {}, { defaultValue: f.titleDefault })}
                </span>
                <span className={cm.cn(cm.prose, 'text-on-surface-variant')}>
                  {t(f.bodyKey, {}, { defaultValue: f.bodyDefault })}
                </span>
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
                  'Found a bug in our bug tracker, have a feature request, or want to talk pricing for your team? Reach out from your account settings — every message goes to a real engineer on the team.',
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
