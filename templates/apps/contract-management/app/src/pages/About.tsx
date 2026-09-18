import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

const FEATURES = [
  {
    key: 'templates',
    defaultValue:
      'A clause-level template library with full version history, so every contract starts from your approved, current language.',
  },
  {
    key: 'signing',
    defaultValue:
      'Built-in e-signing that captures view, sign, and decline events with timestamped, legally defensible receipts.',
  },
  {
    key: 'expiry',
    defaultValue:
      'Automatic expiry and renewal alerts at 90 / 60 / 30 / 15 days, so a deal never lapses unnoticed.',
  },
  {
    key: 'audit',
    defaultValue:
      'A complete, evidentiary audit trail — every edit, send, view, and signature recorded for legal use.',
  },
  {
    key: 'counterparties',
    defaultValue:
      'Counterparty records, portfolio reporting, and Stripe-backed subscription tiers that scale from a solo desk to a full legal team.',
  },
] as const

export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <ContentPageShell
      dataMolId="page-about"
      eyebrow={t('about.eyebrow', {}, { defaultValue: 'About us' })}
      title={t('about.title', { app: APP_NAME }, { defaultValue: `About ${APP_NAME}` })}
      subtitle={t(
        'about.subtitle',
        {},
        {
          defaultValue:
            'Contract management with templates, e-signing, expiry alerts, and a defensible audit trail.',
        },
      )}
    >
      <div className={cm.cn(cm.stack(8), 'text-on-surface-variant')}>
        <p data-mol-id="about-intro" className={cm.cn(cm.textSize('lg'), 'leading-relaxed')}>
          {t(
            'about.intro',
            { app: APP_NAME },
            {
              defaultValue: `${APP_NAME} is a contract management workspace for legal operations, procurement, and revenue teams. Draft from versioned templates, send for signature in a couple of clicks, and keep a defensible record of every executed deal — all in one place.`,
            },
          )}
        </p>

        <section className={cm.stack(3)}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'text-on-surface')}>
            {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
          </h2>
          <p data-mol-id="about-mission" className={'leading-relaxed'}>
            {t(
              'about.missionBody',
              { app: APP_NAME },
              {
                defaultValue: `Contracts carry real risk, yet most teams still manage them across email threads, shared drives, and spreadsheets. ${APP_NAME} keeps the gravity of an executed agreement while moving at the speed of revenue — so the people who bear the risk can prove exactly what was signed, by whom, and when.`,
              },
            )}
          </p>
        </section>

        <section className={cm.stack(3)}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'text-on-surface')}>
            {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
          </h2>
          <ul data-mol-id="about-features" className={cm.cn(cm.stack(2), 'list-disc pl-6')}>
            {FEATURES.map((f) => (
              <li key={f.key} className={'leading-relaxed'}>
                {t(`about.feature.${f.key}`, {}, { defaultValue: f.defaultValue })}
              </li>
            ))}
          </ul>
        </section>

        <section className={cm.stack(3)}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'text-on-surface')}>
            {t('about.contactTitle', {}, { defaultValue: 'Talk to us' })}
          </h2>
          <p data-mol-id="about-contact" className={'leading-relaxed'}>
            {t(
              'about.contactBody',
              {},
              {
                defaultValue:
                  'Have a question, found a bug, or want a walkthrough for your team? Reach out from your account and a real person on the team will get back to you.',
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
