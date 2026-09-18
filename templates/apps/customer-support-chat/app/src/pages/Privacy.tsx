import { ContentPageShell, PrivacyPage } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'

import { Footer } from '../components/Footer.js'

export function Privacy() {
  const { t } = useTranslation()
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
          defaultValue:
            'How the customer support platform collects, uses, and protects information about agents, contacts, and conversations.',
        },
      )}
    >
      <PrivacyPage />
    </ContentPageShell>
  )
}

export default Privacy
export { Privacy as PrivacyPage }
