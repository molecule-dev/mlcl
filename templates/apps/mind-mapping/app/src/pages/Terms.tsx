import { LegalContentPage } from '@molecule/app-legal-pages-react'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { loadContent } from '../config.js'

/**
 * Standalone Terms of Service page. Renders the **same** bonded legal HTML
 * the footer modal shows, wrapped in the app's public footer chrome so the
 * `/terms` route and the footer modal stay in sync.
 *
 * @returns The rendered Terms page.
 */
export function Terms() {
  return (
    <LegalContentPage
      kind="terms"
      appName={APP_NAME}
      loadContent={loadContent}
      footer={<Footer />}
    />
  )
}

export default Terms
export { Terms as TermsPage }
