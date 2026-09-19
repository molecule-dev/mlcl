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
    id: 'account',
    titleKey: 'terms.account.title',
    titleDefault: 'Your account',
    bodyKey: 'terms.account.body',
    bodyDefault:
      'You are responsible for the recipes and pantry contents you save and for keeping your password secure. You must be at least 16 years old to create an account.',
  },
  {
    id: 'use',
    titleKey: 'terms.use.title',
    titleDefault: 'Acceptable use',
    bodyKey: 'terms.use.body',
    bodyDefault: `${APP_NAME} is a planning tool, not dietary advice. Do not use it to harass others, to upload unlawful content, or to attempt to disrupt the service for other people.`,
  },
  {
    id: 'billing',
    titleKey: 'terms.billing.title',
    titleDefault: 'Billing',
    bodyKey: 'terms.billing.body',
    bodyDefault:
      'Paid plans renew automatically until cancelled. You can cancel at any time from Settings; access continues until the end of the current billing period and we do not pro-rate partial periods.',
  },
  {
    id: 'changes',
    titleKey: 'terms.changes.title',
    titleDefault: 'Changes to these terms',
    bodyKey: 'terms.changes.body',
    bodyDefault: `We may update these terms as ${APP_NAME} evolves. Material changes will be announced in-app, and continued use after a change means you accept the revised terms.`,
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
      title={t('terms.title', {}, { defaultValue: 'Terms of service' })}
      subtitle={t(
        'terms.intro',
        {},
        {
          defaultValue: `The conditions under which you may use ${APP_NAME}. By creating an account you accept these terms.`,
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
