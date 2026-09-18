import { ContentPageShell, TermsPage } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'

import { APP_NAME } from '../branding.js'

export function Terms() {
  const { t } = useTranslation()
  return (
    <ContentPageShell
      dataMolId="page-terms"
      eyebrow={t('nav.legal', {}, { defaultValue: 'Legal' })}
      title={t('terms.title', {}, { defaultValue: 'Terms of service' })}
      subtitle={t(
        'terms.intro',
        { appName: APP_NAME },
        {
          defaultValue:
            'The conditions under which you may use {{appName}}. By creating an account you accept these terms.',
        },
      )}
    >
      <TermsPage />
    </ContentPageShell>
  )
}

export default Terms
export { Terms as TermsPage }
