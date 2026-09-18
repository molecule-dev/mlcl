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
      title={t('privacy.title', {}, { defaultValue: 'Privacy policy' })}
      subtitle={t(
        'privacy.intro',
        {},
        { defaultValue: 'How we collect, use, and protect your information.' },
      )}
      bare
    >
      <PrivacyPage />
    </ContentPageShell>
  )
}

export default Privacy
export { Privacy as PrivacyPage }
