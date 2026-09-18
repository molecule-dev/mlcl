import { LegalContentPage } from '@molecule/app-legal-pages-react'

import { APP_NAME } from '../branding.js'
import { LandingFooter } from '../components/LandingFooter.js'
import { LandingNav } from '../components/LandingNav.js'
import { loadContent } from '../config.js'

/**
 * Standalone Terms of Service page. Renders the same bonded legal HTML the
 * footer modal shows, wrapped in Stillpoint's public nav + footer chrome.
 */
export function Terms() {
  return (
    <LegalContentPage
      kind="terms"
      appName={APP_NAME}
      loadContent={loadContent}
      header={<LandingNav />}
      footer={<LandingFooter />}
    />
  )
}

export default Terms
export { Terms as TermsPage }
