import { ContentPageShell, TermsPage as TermsPageBase } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'

import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

/**
 * App-level Terms page wrapper. Forwards rendering to the canonical
 * `@molecule/app-legal-pages-react` component inside `ContentPageShell`,
 * but re-routes the title through this app's i18n bundle so the per-app
 * override key (`terms.title`) is exercised.
 */
export function Terms() {
  const { t } = useTranslation()
  return (
    <ContentPageShell
      dataMolId="page-terms"
      header={<Header />}
      footer={<Footer />}
      eyebrow={t('nav.legal', {}, { defaultValue: 'Legal' })}
      title={t('nav.terms', {}, { defaultValue: 'Terms' })}
      bare
    >
      <TermsPageBase
        titleKey="terms.title"
        titleDefault={t('nav.terms', {}, { defaultValue: 'Terms' })}
      />
    </ContentPageShell>
  )
}

export default Terms
export { Terms as TermsPage }
