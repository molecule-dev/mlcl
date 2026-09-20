/**
 * Public terms-of-service page. Real-content sections (account,
 * acceptable use, your reports, billing, availability, changes) so the
 * page is not a boilerplate stub. Every string flows through `t()`.
 *
 * @returns The rendered terms page.
 */
import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

interface Section {
  id: string
  titleKey: string
  titleDefault: string
  bodyKey: string
  bodyDefault: string
  bodyValues?: Record<string, string>
}

const SECTIONS: Section[] = [
  {
    id: 'account',
    titleKey: 'terms.account.title',
    titleDefault: 'Your account',
    bodyKey: 'terms.account.body',
    bodyDefault:
      'You are responsible for keeping your account credentials secret and for the reports, comments, and confirmations made under your account. You can deactivate your account at any time from Settings; reports you filed remain part of the city\u2019s public record unless withdrawn or removed by city staff.',
  },
  {
    id: 'usage',
    titleKey: 'terms.usage.title',
    titleDefault: 'Acceptable use',
    bodyKey: 'terms.usage.body',
    bodyDefault:
      'You agree not to use {{app}} to harass neighbors or city staff, to file knowingly false reports, to upload photos that infringe third-party rights or depict private individuals without cause, or to attempt to break the platform\u2019s authentication, rate limits, or account isolation.',
    bodyValues: { app: APP_NAME },
  },
  {
    id: 'customerData',
    titleKey: 'terms.customerData.title',
    titleDefault: 'Your reports',
    bodyKey: 'terms.customerData.body',
    bodyDefault:
      'Reports, comments, and photos you create remain your property. You grant the city a license to use them to act on the reported issue. Community reports are visible to other signed-in residents. See the Privacy Policy for retention windows and sub-processor list.',
  },
  {
    id: 'billing',
    titleKey: 'terms.billing.title',
    titleDefault: 'Billing & cancellation',
    bodyKey: 'terms.billing.body',
    bodyDefault:
      'Free accounts cover everyday reporting. Paid plans are billed monthly or yearly via Stripe at the prices listed on /pricing, and can be cancelled anytime from Settings; access continues through the end of the paid period and no refunds are issued for partial periods.',
  },
  {
    id: 'sla',
    titleKey: 'terms.sla.title',
    titleDefault: 'Service availability',
    bodyKey: 'terms.sla.body',
    bodyDefault:
      'We aim for high availability, excluding scheduled maintenance windows, but {{app}} is a reporting channel — not an emergency service. For hazards posing immediate danger, call your local emergency number. Response times for reported issues are set by city operations, not by these terms.',
  },
  {
    id: 'changes',
    titleKey: 'terms.changes.title',
    titleDefault: 'Changes',
    bodyKey: 'terms.changes.body',
    bodyDefault:
      'We will notify you in-app if these terms materially change. Continued use of your account after that notice means you accept the updates.',
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
        { app: APP_NAME },
        {
          defaultValue:
            'These terms govern your use of {{app}}, the City of Riverton\u2019s 311 issue-reporting service. By creating an account you accept them on your own behalf.',
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
              {t(s.bodyKey, s.bodyValues ?? {}, { defaultValue: s.bodyDefault })}
            </p>
          </section>
        ))}
        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
          {t('terms.lastUpdated', {}, { defaultValue: 'Last updated: 2026-05-01' })}
        </p>
      </div>
    </ContentPageShell>
  )
}

export default Terms
export { Terms as TermsPage }
