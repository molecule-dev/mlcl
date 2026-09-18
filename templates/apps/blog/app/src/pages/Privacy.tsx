import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

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
    id: 'collect',
    titleKey: 'privacy.collect.title',
    titleDefault: 'What we collect',
    bodyKey: 'privacy.collect.body',
    bodyDefault:
      'When you create an account we store the email address and password you provide. When you publish, comment, clap, or bookmark, we store the resulting record so we can show it back to you and your readers. We use industry-standard hashing for passwords and tokens.',
  },
  {
    id: 'use',
    titleKey: 'privacy.use.title',
    titleDefault: 'How we use your data',
    bodyKey: 'privacy.use.body',
    bodyDefault:
      'We use your data only to operate the platform: serve your posts to the readers who visit them, calculate analytics on your dashboard, send transactional emails (password resets, billing receipts), and process payments via our payment provider. We never sell or share personal data for advertising.',
  },
  {
    id: 'cookies',
    titleKey: 'privacy.cookies.title',
    titleDefault: 'Cookies and tracking',
    bodyKey: 'privacy.cookies.body',
    bodyDefault:
      'We use a single first-party cookie to keep you signed in and a separate session cookie if you choose to enable analytics. We do not use third-party advertising cookies, fingerprinting scripts, or social-network pixels.',
  },
  {
    id: 'rights',
    titleKey: 'privacy.rights.title',
    titleDefault: 'Your rights',
    bodyKey: 'privacy.rights.body',
    bodyDefault:
      'You can export every post, comment, and bookmark from Settings → Privacy. You can delete your account from Settings → Account; deletion removes all personal data within 30 days. You can ask us to amend incorrect data by emailing privacy@writeflow.example.',
  },
  {
    id: 'updates',
    titleKey: 'privacy.updates.title',
    titleDefault: 'Updates',
    bodyKey: 'privacy.updates.body',
    bodyDefault:
      'When this policy changes we will email every active account at least 14 days before the change takes effect.',
  },
]

export function Privacy() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <ContentPageShell
      dataMolId="page-privacy"
      header={<LandingTopNavBar />}
      footer={<LandingFooter />}
      eyebrow={t('nav.legal', {}, { defaultValue: 'Legal' })}
      title={t('privacy.title', {}, { defaultValue: 'Privacy policy' })}
    >
      <p
        data-mol-id="privacy-effective"
        className={cm.cn(cm.textSize('sm'), cm.sp('mb', 8), 'font-body text-on-surface-variant')}
      >
        {t('privacy.effective', {}, { defaultValue: 'Last updated: 1 May 2026' })}
      </p>
      <div data-mol-id="privacy-sections" className={cm.cn(cm.stack(8))}>
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
