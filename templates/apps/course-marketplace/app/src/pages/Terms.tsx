import { ContentPageShell, TermsPage } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'

import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

export function Terms() {
  const { t } = useTranslation()
  return (
    <ContentPageShell
      dataMolId="page-terms"
      header={<Header />}
      footer={<Footer />}
      eyebrow={t('nav.legal', {}, { defaultValue: 'Legal' })}
      title={t('terms.title', {}, { defaultValue: 'Terms of service' })}
      subtitle={t(
        'terms.intro',
        {},
        {
          defaultValue:
            'The conditions under which you may use the course marketplace. By creating an account you accept these terms.',
        },
      )}
    >
      <TermsPage />
    </ContentPageShell>
  )
}

export default Terms
export { Terms as TermsPage }
