import { ContentPageShell, PrivacyPage as PrivacyPageBase } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'

import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

/**
 * App-level Privacy page wrapper. Forwards rendering to the canonical
 * `@molecule/app-legal-pages-react` component inside `ContentPageShell`,
 * but re-routes the title through this app's i18n bundle so the per-app
 * override key (`privacy.title`) is exercised — and the page satisfies
 * the "every page calls t()" gate.
 */
export function Privacy() {
  const { t } = useTranslation()
  return (
    <ContentPageShell
      dataMolId="page-privacy"
      header={<Header />}
      footer={<Footer />}
      eyebrow={t('nav.legal', {}, { defaultValue: 'Legal' })}
      title={t('nav.privacy', {}, { defaultValue: 'Privacy' })}
      bare
    >
      <PrivacyPageBase
        titleKey="privacy.title"
        titleDefault={t('nav.privacy', {}, { defaultValue: 'Privacy' })}
      />
    </ContentPageShell>
  )
}

export default Privacy
export { Privacy as PrivacyPage }
