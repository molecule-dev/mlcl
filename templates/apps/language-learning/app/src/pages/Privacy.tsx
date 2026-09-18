import { LegalContentPage } from '@molecule/app-legal-pages-react'

import { APP_NAME } from '../branding.js'
import { AuthBrandHeader } from '../components/AuthBrandHeader.js'
import { Footer } from '../components/Footer.js'
import { loadContent } from '../config.js'

/**
 * Standalone Privacy Policy page, rendering the same bonded legal content the
 * footer modal shows (`content.privacyPolicy`).
 *
 * @returns The rendered privacy page.
 */
export function Privacy() {
  return (
    <LegalContentPage
      kind="privacy"
      appName={APP_NAME}
      loadContent={loadContent}
      header={<AuthBrandHeader />}
      footer={<Footer />}
    />
  )
}

export default Privacy
export { Privacy as PrivacyPage }
