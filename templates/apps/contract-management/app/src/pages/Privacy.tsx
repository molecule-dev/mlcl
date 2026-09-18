import { ContentPageShell, PrivacyPage } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'

import { APP_NAME } from '../branding.js'

export function Privacy() {
  const { t } = useTranslation()
  return (
    <ContentPageShell
      dataMolId="page-privacy"
      eyebrow={t('nav.legal', {}, { defaultValue: 'Legal' })}
      title={t('privacy.title', {}, { defaultValue: 'Privacy policy' })}
      subtitle={t(
        'privacy.intro',
        { appName: APP_NAME },
        {
          defaultValue:
            'How {{appName}} collects, uses, and protects information about your contracts and organisation.',
        },
      )}
    >
      <PrivacyPage />
    </ContentPageShell>
  )
}

export default Privacy
export { Privacy as PrivacyPage }
