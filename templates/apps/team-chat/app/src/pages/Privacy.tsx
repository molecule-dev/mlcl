import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'

import { APP_NAME } from '../branding.js'
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
      title={t('nav.privacy', {}, { defaultValue: 'Privacy' })}
    >
      <p>
        {t(
          'privacy.intro',
          { app: APP_NAME },
          {
            defaultValue:
              'We respect your privacy. {{app}} only stores the data you explicitly provide and never sells or shares it without your consent.',
          },
        )}
      </p>
    </ContentPageShell>
  )
}

export default Privacy
