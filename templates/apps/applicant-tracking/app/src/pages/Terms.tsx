import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

interface Section {
  id: string
  titleKey: string
  titleDefault: string
  bodyKey: string
  bodyDefault: string
}

const SECTIONS: Section[] = [
  {
    id: 'acceptableUse',
    titleKey: 'terms.acceptableUseHeading',
    titleDefault: 'Acceptable use',
    bodyKey: 'terms.acceptableUseBody',
    bodyDefault:
      'You will not abuse the service, run automated scraping, attempt to break security, or use it to discriminate against protected classes.',
  },
  {
    id: 'subscription',
    titleKey: 'nav.subscription',
    titleDefault: 'Subscription',
    bodyKey: 'terms.subscriptionBody',
    bodyDefault:
      'Paid plans renew monthly until cancelled. You can cancel from Billing at any time; your plan stays active until the end of the current period.',
  },
  {
    id: 'termination',
    titleKey: 'terms.terminationHeading',
    titleDefault: 'Termination',
    bodyKey: 'terms.terminationBody',
    bodyDefault:
      'We can suspend or terminate accounts that violate these terms. You can request export of your data before deletion.',
  },
]

export function Terms() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <ContentPageShell
      dataMolId="page-terms"
      eyebrow={t('nav.legal', {}, { defaultValue: 'Legal' })}
      title={t('terms.title', {}, { defaultValue: 'Terms of service' })}
      subtitle={t(
        'terms.intro',
        { app: APP_NAME },
        {
          defaultValue:
            'By using {{app}} you agree to these terms. The service is provided on an as-is basis with the obligations and limitations described below.',
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
