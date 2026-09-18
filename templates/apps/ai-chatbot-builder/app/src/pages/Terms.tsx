import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import TopNavBar from '../components/TopNavBar.js'

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
    titleKey: 'terms.useTitle',
    titleDefault: 'Acceptable use',
    bodyKey: 'terms.use',
    bodyDefault:
      'You may build and deploy chatbots for any lawful purpose, subject to model-provider usage policies.',
  },
  {
    id: 'data',
    titleKey: 'terms.dataTitle',
    titleDefault: 'Data ownership',
    bodyKey: 'terms.data',
    bodyDefault:
      'You retain ownership of your training data and conversations. We process them only to deliver the service.',
  },
  {
    id: 'billing',
    titleKey: 'settings.billing',
    titleDefault: 'Billing',
    bodyKey: 'terms.billing',
    bodyDefault:
      'Subscriptions renew automatically. Cancel any time from Settings → Billing — no fees apply.',
  },
]

export function Terms() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <ContentPageShell
      dataMolId="page-terms"
      header={<TopNavBar />}
      eyebrow={t('nav.legal', {}, { defaultValue: 'Legal' })}
      title={t('terms.heading', {}, { defaultValue: 'Terms of service' })}
      subtitle={t(
        'terms.intro',
        { appName: APP_NAME },
        {
          defaultValue:
            'By using {{appName}} you agree to the following terms governing access to the platform.',
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
