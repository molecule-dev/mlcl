import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import LandingFooter from '../components/LandingFooter.js'
import LandingTopNavBar from '../components/LandingTopNavBar.js'

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
      'You must be at least 13 years old to create an account on {{appName}}. By signing up you confirm that you meet that age and that the information you provide is accurate.',
  },
  {
    id: 'content',
    titleKey: 'terms.content.title',
    titleDefault: 'Your content',
    bodyKey: 'terms.content.body',
    bodyDefault:
      'You retain ownership of every post, comment, and image you publish. By publishing on {{appName}} you grant us a non-exclusive worldwide license to host and display your content for the purpose of operating the service. Delete a post and the license ends.',
  },
  {
    id: 'conduct',
    titleKey: 'terms.conduct.title',
    titleDefault: 'Acceptable use',
    bodyKey: 'terms.conduct.body',
    bodyDefault:
      'Do not publish content that infringes copyright, harasses or threatens others, exposes private information without consent, or qualifies as illegal under applicable law. We may remove content and suspend accounts that violate these rules.',
  },
  {
    id: 'billing',
    titleKey: 'terms.billing.title',
    titleDefault: 'Billing',
    bodyKey: 'terms.billing.body',
    bodyDefault:
      'Paid plans are billed monthly or annually via our payment provider. You can cancel any time from Settings → Billing; cancellation stops the next renewal but does not refund the current period unless we made a billing error.',
  },
  {
    id: 'termination',
    titleKey: 'terms.termination.title',
    titleDefault: 'Termination',
    bodyKey: 'terms.termination.body',
    bodyDefault:
      'You may close your account at any time from Settings → Account. We may suspend an account if it violates these terms. We will email you a 30-day notice before any policy-driven termination so you can export your work.',
  },
  {
    id: 'changes',
    titleKey: 'terms.changes.title',
    titleDefault: 'Changes to these terms',
    bodyKey: 'terms.changes.body',
    bodyDefault:
      'When we change material parts of these terms we will email every active account at least 14 days in advance. Continued use after the effective date constitutes acceptance.',
  },
]

export function Terms() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <ContentPageShell
      dataMolId="page-terms"
      header={<LandingTopNavBar />}
      footer={<LandingFooter />}
      eyebrow={t('nav.legal', {}, { defaultValue: 'Legal' })}
      title={t('terms.title', {}, { defaultValue: 'Terms of service' })}
    >
      <p
        data-mol-id="terms-effective"
        className={cm.cn(cm.textSize('sm'), cm.sp('mb', 8), 'font-body text-on-surface-variant')}
      >
        {t('terms.effective', {}, { defaultValue: 'Last updated: 1 May 2026' })}
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
