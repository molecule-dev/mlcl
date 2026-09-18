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
}

const SECTIONS: Section[] = [
  {
    id: 'tiers',
    titleKey: 'terms.tiers.title',
    titleDefault: 'Subscription tiers',
    bodyKey: 'terms.tiers.body',
    bodyDefault:
      '{{appName}} is offered on the Free, Pro, and Team tiers. The Free tier is available at no cost; Pro and Team are billed in advance on a recurring basis through our payment provider. You can upgrade, downgrade, or cancel at any time, and changes take effect at the start of your next billing period.',
  },
  {
    id: 'acceptable-use',
    titleKey: 'terms.acceptableUse.title',
    titleDefault: 'Acceptable use',
    bodyKey: 'terms.acceptableUse.body',
    bodyDefault:
      'You agree to use {{appName}} only for lawful personal or team financial tracking, not to attempt to disrupt the service, reverse-engineer it, or access another user’s data. We may suspend accounts that abuse the service or attempt to circumvent tier limits.',
  },
  {
    id: 'ownership',
    titleKey: 'terms.ownership.title',
    titleDefault: 'Your data, your ownership',
    bodyKey: 'terms.ownership.body',
    bodyDefault:
      'You remain the sole owner of the financial records you enter. We claim no ownership over your accounts, transactions, budgets, or goals, and you can export or delete them at any time from Settings → Data & Privacy.',
  },
  {
    id: 'warranty',
    titleKey: 'terms.warranty.title',
    titleDefault: 'Service “as is” and liability',
    bodyKey: 'terms.warranty.body',
    bodyDefault:
      '{{appName}} is provided “as is”, without warranties of any kind. We work hard to keep your data safe and the service available, but to the extent permitted by law we are not liable for indirect or consequential losses arising from your use of the service.',
  },
]

export function Terms() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <ContentPageShell
      dataMolId="page-terms"
      header={<Header />}
      footer={<Footer />}
      eyebrow={t('nav.legal', {}, { defaultValue: 'Legal' })}
      title={t('nav.terms', {}, { defaultValue: 'Terms' })}
    >
      <p
        data-mol-id="terms-intro"
        className={cm.cn(cm.textSize('base'), cm.sp('mb', 8), 'font-body text-on-surface-variant')}
      >
        {t(
          'terms.intro',
          { appName: APP_NAME },
          {
            defaultValue:
              'These terms cover use of {{appName}} — including the Free, Pro, and Team subscription tiers. By signing up you agree that your usage is bound by these terms, that we provide the service "as is", and that you remain the sole owner of the financial records you enter.',
          },
        )}
      </p>
      <div data-mol-id="terms-sections" className={cm.cn(cm.stack(8))}>
        {SECTIONS.map((s) => (
          <section key={s.id} data-mol-id={`terms-${s.id}`} className={cm.cn(cm.stack(2))}>
            <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
              {t(s.titleKey, {}, { defaultValue: s.titleDefault })}
            </h2>
            <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
              {t(s.bodyKey, { appName: APP_NAME }, { defaultValue: s.bodyDefault })}
            </p>
          </section>
        ))}
      </div>
    </ContentPageShell>
  )
}

export default Terms
export { Terms as TermsPage }
