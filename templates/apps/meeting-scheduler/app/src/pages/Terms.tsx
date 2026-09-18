import { LegalContentPage } from '@molecule/app-legal-pages-react'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { loadContent } from '../config.js'

/**
 * Standalone Terms of Service page. Renders the same bonded legal content the
 * footer modal shows, wrapped in Meridian's public footer chrome.
 *
 * @returns The rendered terms page.
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
