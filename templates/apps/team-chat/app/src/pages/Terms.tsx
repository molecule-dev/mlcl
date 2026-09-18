import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'

import { APP_NAME } from '../branding.js'
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
      title={t('nav.terms', {}, { defaultValue: 'Terms' })}
    >
      <p>
        {t(
          'terms.intro',
          { app: APP_NAME },
          {
            defaultValue:
              'By using {{app}}, you agree to play nice with your team, respect channel guidelines, and accept that paid features require an active subscription.',
          },
        )}
      </p>
    </ContentPageShell>
  )
}

export default Terms
