import { LegalContentPage } from '@molecule/app-legal-pages-react'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { loadContent } from '../config.js'

/**
 * Standalone Privacy Policy page. Renders the same bonded legal content the
 * footer modal shows, wrapped in Meridian's public footer chrome.
 *
 * @returns The rendered privacy page.
 */
export function Privacy() {
  return (
    <LegalContentPage
      kind="privacy"
      appName={APP_NAME}
      loadContent={loadContent}
      footer={<Footer />}
    />
  )
}

export default Privacy
export { Privacy as PrivacyPage }
