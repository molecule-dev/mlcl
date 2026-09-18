/**
 * Public Terms of Service. Plain-English contract between Pylon and the
 * person using it. i18n defaults so locales can override.
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
}

const SECTIONS: Section[] = [
  {
    id: 'account',
    titleKey: 'nav.yourAccount',
    titleDefault: 'Your account',
    bodyKey: 'terms.account.body',
    bodyDefault:
      'You are responsible for safeguarding your password. Sharing one account with multiple humans is not permitted on Free or Pro plans — buy a Team subscription for shared workspaces.',
  },
  {
    id: 'usage',
    titleKey: 'terms.usage.title',
    titleDefault: 'Acceptable use',
    bodyKey: 'terms.usage.body',
    bodyDefault:
      'Do not use {{app}} to fire requests at services you do not own or have explicit permission to test. Do not use {{app}} to circumvent rate limits or commit fraud.',
  },
  {
    id: 'billing',
    titleKey: 'settings.billing',
    titleDefault: 'Billing',
    bodyKey: 'terms.billing.body',
    bodyDefault:
      'Paid subscriptions renew automatically each billing period. Cancel from Settings at any time; your access continues until the end of the current period.',
  },
  {
    id: 'warranty',
    titleKey: 'terms.warranty.title',
    titleDefault: 'No warranty',
    bodyKey: 'terms.warranty.body',
    bodyDefault:
      '{{app}} is provided "as is" without warranty of any kind. We aim for 99.9% uptime but do not guarantee it on Free or Pro plans.',
  },
  {
    id: 'changes',
    titleKey: 'terms.changes.title',
    titleDefault: 'Changes',
    bodyKey: 'terms.changes.body',
    bodyDefault:
      'We will email every active account at least 30 days before any material change to these terms takes effect.',
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
            'By creating a {{app}} account you agree to the terms below. Read them once; we will not surprise you with retroactive changes.',
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
              {t(s.bodyKey, { app: APP_NAME }, { defaultValue: s.bodyDefault })}
            </p>
          </section>
        ))}
      </div>
    </ContentPageShell>
  )
}

export default Terms
export { Terms as TermsPage }
