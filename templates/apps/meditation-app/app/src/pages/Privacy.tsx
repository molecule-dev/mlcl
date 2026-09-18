import { LegalContentPage } from '@molecule/app-legal-pages-react'

import { APP_NAME } from '../branding.js'
import { LandingFooter } from '../components/LandingFooter.js'
import { LandingNav } from '../components/LandingNav.js'
import { loadContent } from '../config.js'

/**
 * Standalone Privacy policy page. Renders the same bonded legal HTML the
 * footer modal shows, wrapped in Stillpoint's public nav + footer chrome.
 */
export function Privacy() {
  return (
    <LegalContentPage
      kind="privacy"
      appName={APP_NAME}
      loadContent={loadContent}
      header={<LandingNav />}
      footer={<LandingFooter />}
    />
  )
}

export default Privacy
export { Privacy as PrivacyPage }
