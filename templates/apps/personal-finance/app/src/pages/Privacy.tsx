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
    id: 'collect',
    titleKey: 'privacy.collect.title',
    titleDefault: 'What we collect',
    bodyKey: 'privacy.collect.body',
    bodyDefault:
      'We store the email address and password you use to create your {{appName}} account, plus the accounts, transactions, budgets, categories, and savings goals you enter. Passwords and reset tokens are stored using industry-standard hashing — never in plain text.',
  },
  {
    id: 'use',
    titleKey: 'privacy.use.title',
    titleDefault: 'How we use your data',
    bodyKey: 'privacy.use.body',
    bodyDefault:
      'Your financial data is used only to operate {{appName}}: to show your net worth, budgets, and reports back to you, to send transactional emails (password resets, billing receipts), and to process subscription payments via our payment provider. We never sell or share your financial data for advertising.',
  },
  {
    id: 'processors',
    titleKey: 'privacy.processors.title',
    titleDefault: 'Who processes your data',
    bodyKey: 'privacy.processors.body',
    bodyDefault:
      'A small set of sub-processors act on our behalf: our cloud host stores the encrypted database, our email provider delivers transactional mail, and our payment provider handles Pro and Team subscription billing. Each is bound by a data-processing agreement and may only use your data to provide their service to us.',
  },
  {
    id: 'rights',
    titleKey: 'privacy.rights.title',
    titleDefault: 'Your rights and how to delete your data',
    bodyKey: 'privacy.rights.body',
    bodyDefault:
      'You can export every account, transaction, budget, and goal from Settings → Data & Privacy. You can delete your {{appName}} account from the same screen; deletion permanently removes all of your financial records within 30 days. To amend incorrect data, contact privacy@emeraldledger.example.',
  },
]

export function Privacy() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <ContentPageShell
      dataMolId="page-privacy"
      header={<Header />}
      footer={<Footer />}
      eyebrow={t('nav.legal', {}, { defaultValue: 'Legal' })}
      title={t('nav.privacy', {}, { defaultValue: 'Privacy' })}
    >
      <p
        data-mol-id="privacy-intro"
        className={cm.cn(cm.textSize('base'), cm.sp('mb', 8), 'font-body text-on-surface-variant')}
      >
        {t(
          'privacy.intro',
          { appName: APP_NAME },
          {
            defaultValue:
              '{{appName}} collects only the financial data you choose to enter — your accounts, transactions, budgets, and savings goals. We never sell or share that data. This page describes what we collect, who processes it on our behalf, and how to delete your data.',
          },
        )}
      </p>
      <div data-mol-id="privacy-sections" className={cm.cn(cm.stack(8))}>
        {SECTIONS.map((s) => (
          <section key={s.id} data-mol-id={`privacy-${s.id}`} className={cm.cn(cm.stack(2))}>
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

export default Privacy
export { Privacy as PrivacyPage }
