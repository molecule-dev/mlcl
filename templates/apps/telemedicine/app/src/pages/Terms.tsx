import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'

interface Section {
  id: string
  titleKey: string
  titleDefault: string
  bodyKey: string
  bodyDefault: string
}

const SECTIONS: Section[] = [
  {
    id: 'eligibility',
    titleKey: 'terms.eligibility.title',
    titleDefault: 'Eligibility',
    bodyKey: 'terms.eligibility.body',
    bodyDefault:
      'You must be at least eighteen years old, or the parent or legal guardian of a minor for whom you are seeking care, and physically located in a U.S. state where our clinicians are licensed.',
  },
  {
    id: 'scope',
    titleKey: 'terms.scope.title',
    titleDefault: 'Scope of care',
    bodyKey: 'terms.scope.body',
    bodyDefault:
      'Telehealth visits are appropriate for non-emergency primary, behavioral, and dermatologic care. If you experience a medical emergency, call 911 or go to the nearest emergency room.',
  },
  {
    id: 'payment',
    titleKey: 'terms.payment.title',
    titleDefault: 'Billing and refunds',
    bodyKey: 'terms.payment.body',
    bodyDefault:
      'Subscription plans renew monthly until cancelled. Cancel anytime from Settings; you keep access through the end of the current billing period. Visit fees are charged at completion of the consult.',
  },
  {
    id: 'contact',
    titleKey: 'nav.contact',
    titleDefault: 'Contact',
    bodyKey: 'terms.contact.body',
    bodyDefault: 'Questions about these terms? Email legal@solace.health.',
  },
]

export function Terms() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <ContentPageShell
      dataMolId="page-terms"
      footer={<Footer />}
      eyebrow={t('nav.legal', {}, { defaultValue: 'Legal' })}
      title={t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
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
              'By creating an account on {{appName}} you agree to the terms below. They govern your use of the service, the standard of care you can expect, and the limits of our liability.',
          },
        )}
      </p>
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
