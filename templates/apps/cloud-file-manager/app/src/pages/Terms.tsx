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
    id: 'use',
    titleKey: 'terms.useTitle',
    titleDefault: 'Acceptable use',
    bodyKey: 'terms.intro',
    bodyDefault:
      'By using {{appName}} you agree to keep your account credentials confidential and to upload only content you have the right to store and share.',
  },
  {
    id: 'limits',
    titleKey: 'terms.limitsTitle',
    titleDefault: 'Limits',
    bodyKey: 'terms.usage',
    bodyDefault:
      'Storage and bandwidth limits are listed on the Pricing page. Sustained abuse, malware distribution, or violation of applicable law will result in account suspension.',
  },
  {
    id: 'liability',
    titleKey: 'terms.liabilityTitle',
    titleDefault: 'Liability',
    bodyKey: 'terms.liability',
    bodyDefault:
      '{{appName}} is provided "as is." We make commercially reasonable efforts to maintain availability but are not liable for indirect or consequential damages arising from use of the service.',
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
      title={t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
      subtitle={t(
        'terms.subtitle',
        { appName: APP_NAME },
        { defaultValue: 'The conditions under which you may use {{appName}}.' },
      )}
    >
      <div className={cm.cn(cm.stack(8))}>
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
        <nav data-mol-id="terms-back-home" />
      </div>
    </ContentPageShell>
  )
}

export default Terms
export { Terms as TermsPage }
