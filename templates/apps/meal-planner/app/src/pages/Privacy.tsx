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
    id: 'collect',
    titleKey: 'privacy.collect.title',
    titleDefault: 'What we store',
    bodyKey: 'privacy.collect.body',
    bodyDefault:
      'Account: your email, hashed password, and display name; planning data: the recipes, weekly meal plans, grocery lists, and pantry contents you record; and billing: subscription status plus the Stripe customer/subscription identifiers required to run the plan you chose.',
  },
  {
    id: 'share',
    titleKey: 'privacy.share.title',
    titleDefault: 'Who can see your data',
    bodyKey: 'privacy.share.body',
    bodyDefault:
      'Only you. We never sell, share, or rent your planning data to third parties. Server logs are retained for 30 days for incident response and then deleted.',
  },
  {
    id: 'rights',
    titleKey: 'privacy.rights.title',
    titleDefault: 'Your controls',
    bodyKey: 'privacy.rights.body',
    bodyDefault:
      'You can export your recipe box at any time from Settings, or delete your account to permanently remove all of your data within 30 days.',
  },
  {
    id: 'contact',
    titleKey: 'privacy.contact.title',
    titleDefault: 'Questions',
    bodyKey: 'privacy.contact.body',
    bodyDefault:
      'Email privacy@simmer.app for any data-handling question. We answer every request within five business days.',
  },
]

export function Privacy() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <ContentPageShell
      dataMolId="page-privacy"
      footer={<Footer />}
      eyebrow={t('nav.legal', {}, { defaultValue: 'Legal' })}
      title={t('privacy.title', {}, { defaultValue: 'Privacy policy' })}
      subtitle={t(
        'privacy.intro',
        {},
        {
          defaultValue: `How ${APP_NAME} collects, uses, and protects information about you and your planning data.`,
        },
      )}
    >
      <div className={cm.cn(cm.stack(8))}>
        {SECTIONS.map((s) => (
          <section key={s.id} data-mol-id={`privacy-${s.id}`} className={cm.cn(cm.stack(2))}>
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

export default Privacy
export { Privacy as PrivacyPage }
