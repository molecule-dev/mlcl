import { LegalContentPage } from '@molecule/app-legal-pages-react'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'
import { loadContent } from '../config.js'

/**
 * Standalone Privacy policy page. Renders the same bonded legal HTML the
 * footer modal shows, so the modal and the `/privacy` route stay in sync.
 *
 * @returns The rendered privacy page.
 */
export function Privacy() {
  return (
    <LegalContentPage
      kind="privacy"
      appName={APP_NAME}
      loadContent={loadContent}
      header={<Header />}
      footer={<Footer />}
    />
  )
}

export default Privacy
export { Privacy as PrivacyPage }
