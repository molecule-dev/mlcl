import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { PublicHeader } from '../components/PublicHeader.js'

interface Section {
  id: string
  titleKey: string
  titleDefault: string
  bodyKey: string
  bodyDefault: string
}

const SECTIONS: Section[] = [
  {
    id: 'store',
    titleKey: 'privacy.dataWeStoreHeading',
    titleDefault: 'What we store',
    bodyKey: 'privacy.dataWeStore',
    bodyDefault:
      'Account ownership records, balances, transfer history, and audit events linked to your user. Card numbers are encrypted at rest with AES-256 and only the last four digits are returned by our APIs.',
  },
  {
    id: 'share',
    titleKey: 'privacy.dataWeShareHeading',
    titleDefault: 'What we share',
    bodyKey: 'privacy.dataWeShare',
    bodyDefault:
      'Personal banking data is never sold. We share information with payment processors, card networks, and regulators only as required to settle transactions or meet legal obligations.',
  },
  {
    id: 'rights',
    titleKey: 'privacy.yourRightsHeading',
    titleDefault: 'Your rights',
    bodyKey: 'privacy.yourRights',
    bodyDefault:
      'You can export your account data from Settings, request deletion of inactive accounts, and revoke any trusted device with one click. We will respond to verified requests within 30 days.',
  },
]

export function Privacy() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <ContentPageShell
      dataMolId="page-privacy"
      header={<PublicHeader />}
      footer={<Footer />}
      eyebrow={t('nav.legal', {}, { defaultValue: 'Legal' })}
      title={t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
      subtitle={t(
        'privacy.intro',
        { appName: APP_NAME },
        {
          defaultValue:
            '{{appName}} collects only the information required to operate your bank accounts: your contact details, the transactions you initiate, the devices you sign in from, and any documents you upload to verify your identity.',
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
