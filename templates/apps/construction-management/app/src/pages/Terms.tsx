import { useEffect } from 'react'

import { ContentPageShell, TermsPage } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'

/**
 * Project-management's Terms page wraps the canonical
 * `@molecule/app-legal-pages-react` `TermsPage` inside `ContentPageShell`
 * with a hero band. The wrapper exists so the per-app page can localize the
 * document title independently from the shared component's defaults.
 *
 * @returns The rendered terms page.
 */
export function Terms() {
  const { t } = useTranslation()
  const pageTitle = t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })

  useEffect(() => {
    document.title = pageTitle
  }, [pageTitle])

  return (
    <ContentPageShell
      dataMolId="page-terms"
      eyebrow={t('nav.legal', {}, { defaultValue: 'Legal' })}
      title={pageTitle}
      bare
    >
      <TermsPage titleKey="terms.pageTitle" titleDefault={pageTitle} />
    </ContentPageShell>
  )
}

export default Terms
export { TermsPage }
