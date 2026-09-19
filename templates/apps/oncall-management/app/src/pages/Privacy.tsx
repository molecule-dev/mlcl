import { LegalContentPage } from '@molecule/app-legal-pages-react'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { loadContent } from '../config.js'

/**
 * Standalone Privacy policy page at `/privacy`. Renders the **same** bonded
 * legal copy the footer modal shows, wrapped in the app's shared {@link Footer}
 * chrome so the two surfaces stay in sync.
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
