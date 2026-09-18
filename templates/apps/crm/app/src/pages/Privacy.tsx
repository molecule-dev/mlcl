import { ContentPageShell, PrivacyPage } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'

import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

export function Privacy() {
  const { t } = useTranslation()
  return (
    <ContentPageShell
      dataMolId="page-privacy"
      header={<Header />}
      footer={<Footer />}
      eyebrow={t('nav.legal', {}, { defaultValue: 'Legal' })}
      title={t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
      subtitle={t(
        'privacy.intro',
        {},
        {
          defaultValue:
            'How the CRM collects, uses, and protects information about your contacts, deals, and organisation.',
        },
      )}
    >
      <PrivacyPage />
    </ContentPageShell>
  )
}

export default Privacy
export { PrivacyPage }
