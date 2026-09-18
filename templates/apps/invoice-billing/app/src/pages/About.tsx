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
    id: 'invoices',
    titleKey: 'about.feature.invoices.title',
    titleDefault: 'Polished invoices',
    bodyKey: 'about.feature.invoices.body',
    bodyDefault:
      'Build branded invoices in seconds, attach a one-tap "Pay" button, and watch them get opened, printed, and paid — all from one screen.',
  },
  {
    id: 'recurring',
    titleKey: 'about.feature.recurring.title',
    titleDefault: 'Recurring billing',
    bodyKey: 'about.feature.recurring.body',
    bodyDefault:
      'Put monthly retainers on autopilot. Schedule a cadence once and let each invoice generate and auto-collect via Stripe.',
  },
  {
    id: 'payments',
    titleKey: 'about.feature.payments.title',
    titleDefault: 'Built-in payments',
    bodyKey: 'about.feature.payments.body',
    bodyDefault:
      'Accept cards through Stripe with bank-grade encryption, reconcile every payment automatically, and always know what is outstanding.',
  },
  {
    id: 'clients',
    titleKey: 'about.feature.clients.title',
    titleDefault: 'Client workspace',
    bodyKey: 'about.feature.clients.body',
    bodyDefault:
      'Keep contacts, balances, and payment history for every client in one place, so the next invoice is already half-written.',
  },
  {
    id: 'reports',
    titleKey: 'about.feature.reports.title',
    titleDefault: 'Tax-ready reports',
    bodyKey: 'about.feature.reports.body',
    bodyDefault:
      'Revenue, aging, and tax summaries are calculated for you and exportable to CSV — bookkeeping-free at quarter-end.',
  },
]

export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <ContentPageShell
      dataMolId="page-about"
      containerSize="lg"
      header={<Header />}
      footer={<Footer />}
      eyebrow={t('about.eyebrow', {}, { defaultValue: 'About us' })}
      title={t('about.pageTitle', { app: APP_NAME }, { defaultValue: `About ${APP_NAME}` })}
    >
      <div className={cm.cn(cm.stack(8))}>
        <p
          data-mol-id="about-intro"
          className={cm.cn(cm.prose, cm.textSize('lg'), 'text-on-surface-variant')}
        >
          {t(
            'about.intro',
            { app: APP_NAME },
            {
              defaultValue:
                '{{app}} is invoicing built for small businesses and freelancers who would rather get paid than wrestle with spreadsheets. Send polished invoices, collect payments, automate recurring billing, and keep tax-ready reports — all in one place.',
            },
          )}
        </p>

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
                  'Cash flow is the heartbeat of every small business. {{app}} exists to shorten the distance between finishing the work and seeing the money land — so you spend your time on clients, not chasing overdue invoices.',
              },
            )}
          </p>
        </section>

        <section data-mol-id="about-features" className={cm.cn(cm.stack(4))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
          </h2>
          <ul className={cm.cn(cm.stack(4))}>
            {FEATURES.map((feature) => (
              <li key={feature.id} className={cm.cn(cm.stack(1))}>
                <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
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
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.contactTitle', {}, { defaultValue: 'Talk to us' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.contactBody',
              { app: APP_NAME },
              {
                defaultValue:
                  'Have a question, found a bug, or want a feature? Reach the {{app}} team from your account settings — every message goes to a real person who works on the product.',
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
