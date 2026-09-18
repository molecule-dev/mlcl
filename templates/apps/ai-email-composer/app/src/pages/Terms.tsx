import { LegalContentPage } from '@molecule/app-legal-pages-react'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { PublicNav } from '../components/PublicNav.js'
import { loadContent } from '../config.js'

/**
 * Standalone Terms of Service page. Renders the same bonded legal HTML the
 * footer modal shows, wrapped in Signet's public chrome (PublicNav +
 * Footer) so the `/terms` route and the in-place footer modal stay in sync.
 *
 * @returns The rendered Terms page.
 */
export function Terms() {
  return (
    <LegalContentPage
      kind="terms"
      appName={APP_NAME}
      loadContent={loadContent}
      header={<PublicNav />}
      footer={<Footer />}
    />
  )
}

export default Terms
export { Terms as TermsPage }
