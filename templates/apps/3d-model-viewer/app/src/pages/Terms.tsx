import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import LandingFooter from '../components/LandingFooter.js'
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
    id: 'accounts',
    titleKey: 'terms.accounts.title',
    titleDefault: 'Accounts',
    bodyKey: 'terms.accounts.body',
    bodyDefault:
      'You must provide accurate registration information and keep your credentials secure. You are responsible for all activity under your account.',
  },
  {
    id: 'content',
    titleKey: 'terms.content.title',
    titleDefault: 'Your content',
    bodyKey: 'terms.content.body',
    bodyDefault:
      'You retain ownership of the 3D models and assets you upload. By uploading you grant us a limited licence to store and serve them on your behalf.',
  },
  {
    id: 'billing',
    titleKey: 'terms.billing.title',
    titleDefault: 'Billing',
    bodyKey: 'terms.billing.body',
    bodyDefault:
      'Paid subscriptions renew automatically. You may cancel at any time from Settings; no further charges apply after the current billing period ends.',
  },
  {
    id: 'termination',
    titleKey: 'terms.termination.title',
    titleDefault: 'Termination',
    bodyKey: 'terms.termination.body',
    bodyDefault:
      'We may suspend accounts that violate these Terms after written notice. You may delete your account at any time from Settings.',
  },
]

export function Terms() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <ContentPageShell
      dataMolId="page-terms"
      header={<TopNavBar />}
      footer={<LandingFooter />}
      eyebrow={t('nav.legal', {}, { defaultValue: 'Legal' })}
      title={t('terms.title', {}, { defaultValue: 'Terms of service' })}
      subtitle={t('terms.effective', {}, { defaultValue: 'Last updated: 1 May 2026' })}
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
