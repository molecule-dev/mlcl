import { useEffect } from 'react'

import { ContentPageShell, PrivacyPage } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'

/**
 * Project-management's Privacy page wraps the canonical
 * `@molecule/app-legal-pages-react` `PrivacyPage` inside `ContentPageShell`
 * with a hero band. The wrapper exists so the per-app page can localize the
 * document title independently from the shared component's defaults.
 *
 * @returns The rendered privacy page.
 */
export function Privacy() {
  const { t } = useTranslation()
  const pageTitle = t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })

  useEffect(() => {
    document.title = pageTitle
  }, [pageTitle])

  return (
    <ContentPageShell
      dataMolId="page-privacy"
      eyebrow={t('nav.legal', {}, { defaultValue: 'Legal' })}
      title={pageTitle}
      bare
    >
      <PrivacyPage titleKey="privacy.pageTitle" titleDefault={pageTitle} />
    </ContentPageShell>
  )
}

export default Privacy
export { PrivacyPage }
