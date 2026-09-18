/**
 * Terms — public terms of service.
 */
import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

interface Section {
  id: string
  titleKey: string
  titleDefault: string
  bodyKey: string
  bodyDefault: string
}

const SECTIONS: Section[] = [
  {
    id: 'acceptable',
    titleKey: 'terms.acceptable.title',
    titleDefault: 'Acceptable use',
    bodyKey: 'terms.acceptable.body',
    bodyDefault:
      'You agree not to use the service to send spam, scrape sites in violation of their terms, or run workflows that intentionally cause downstream service degradation. Workflows that abuse third-party APIs may be paused without notice.',
  },
  {
    id: 'billing',
    titleKey: 'settings.billing',
    titleDefault: 'Billing',
    bodyKey: 'terms.billing.body',
    bodyDefault:
      'Free workspaces include a fixed monthly run quota. Paid workspaces are billed monthly in arrears for usage above included quota. You can cancel from the billing page; cancellations take effect at the end of the current billing period.',
  },
  {
    id: 'liability',
    titleKey: 'terms.liability.title',
    titleDefault: 'Liability',
    bodyKey: 'terms.liability.body',
    bodyDefault:
      'The service is provided as-is. We are not liable for downstream effects of workflow execution; you are responsible for testing and monitoring your own automations. Aggregate liability is limited to fees paid in the prior twelve months.',
  },
  {
    id: 'changes',
    titleKey: 'terms.changes.title',
    titleDefault: 'Changes',
    bodyKey: 'terms.changes.body',
    bodyDefault:
      'We may update these terms with at least 30 days notice via email and an in-app banner. Continued use after the effective date constitutes acceptance.',
  },
]

export function Terms() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <ContentPageShell
      dataMolId="page-terms"
      header={<Header />}
      footer={<Footer />}
      eyebrow={t('nav.legal', {}, { defaultValue: 'Legal' })}
      title={t('terms.title', {}, { defaultValue: 'Terms of service' })}
      subtitle={t(
        'terms.intro',
        {},
        {
          defaultValue:
            'The conditions under which you may use the workflow automator service. By signing up or running a workflow, you accept these terms.',
        },
      )}
    >
      <div className={cm.cn(cm.stack(8))}>
        {SECTIONS.map((s) => (
          <section key={s.id} data-mol-id={`terms-${s.id}`} className={cm.cn(cm.stack(2))}>
            <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
              {t(s.titleKey, {}, { defaultValue: s.titleDefault })}
            </h2>
            <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
              {t(s.bodyKey, {}, { defaultValue: s.bodyDefault })}
            </p>
          </section>
        ))}
      </div>
    </ContentPageShell>
  )
}

export default Terms
export { Terms as TermsPage }
