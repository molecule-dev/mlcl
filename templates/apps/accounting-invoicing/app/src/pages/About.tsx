import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

interface Feature {
  id: string
  titleKey: string
  titleDefault: string
  bodyKey: string
  bodyDefault: string
}

const FEATURES: Feature[] = [
  {
    id: 'invoicing',
    titleKey: 'about.feature.invoicing.title',
    titleDefault: 'Invoicing that gets you paid',
    bodyKey: 'about.feature.invoicing.body',
    bodyDefault:
      'Build branded, A4-formatted invoices in seconds, email them straight to your customer, and track every view and payment event end-to-end.',
  },
  {
    id: 'expenses',
    titleKey: 'about.feature.expenses.title',
    titleDefault: 'Expenses without the shoebox',
    bodyKey: 'about.feature.expenses.body',
    bodyDefault:
      'Snap a receipt or drag in a CSV, auto-categorize spend, match it to your bank feeds, and file deductibles before tax season arrives.',
  },
  {
    id: 'reports',
    titleKey: 'about.feature.reports.title',
    titleDefault: 'Reports your accountant trusts',
    bodyKey: 'about.feature.reports.body',
    bodyDefault:
      'Profit-and-loss, cash-flow, balance sheet, and sales-tax-by-jurisdiction — all on demand and exportable for the people who do your books.',
  },
  {
    id: 'reconcile',
    titleKey: 'about.feature.reconcile.title',
    titleDefault: 'Reconcile in one pass',
    bodyKey: 'about.feature.reconcile.body',
    bodyDefault:
      'Bank feeds and payment processors are auto-matched, so unmatched transactions surface with a single click instead of a spreadsheet.',
  },
]

/**
 * Public About page describing what the app does and who it is for.
 *
 * @returns The rendered About page.
 */
export function About() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <ContentPageShell
      dataMolId="page-about"
      eyebrow={t('about.eyebrow', {}, { defaultValue: 'About' })}
      title={t('about.title', { app: APP_NAME }, { defaultValue: 'About {{app}}' })}
      subtitle={t(
        'about.intro',
        { app: APP_NAME },
        {
          defaultValue:
            '{{app}} is small-business accounting that keeps every cent accounted for — invoices, expenses, payments, and reports in one calm place for owners, bookkeepers, and accountants.',
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
                  'Running a business should not mean dreading your books. {{app}} replaces the spreadsheet sprawl with clear numbers you can act on, so you spend less time reconciling and more time doing the work you actually started the business to do.',
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
              { app: APP_NAME },
              {
                defaultValue:
                  'Have a question, found a bug, or want to move your books over? Reach the {{app}} team at hello@{{app}}.example — a real person reads every message.',
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
