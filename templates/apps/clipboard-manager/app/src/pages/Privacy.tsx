import { LegalContentPage } from '@molecule/app-legal-pages-react'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { loadContent } from '../config.js'

/**
 * Standalone Privacy Policy page. Renders the same bonded legal HTML the
 * footer modal shows, wrapped in Yank's public chrome (the shared Footer)
 * so the `/privacy` route and the in-place footer modal stay in sync.
 *
 * @returns The rendered Privacy page.
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
