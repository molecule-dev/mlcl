import { LegalContentPage } from '@molecule/app-legal-pages-react'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'
import { loadContent } from '../config.js'

/**
 * Standalone privacy policy page.
 *
 * Renders the same bonded legal content shown in the footer modal, wrapped
 * in the app's public header + footer chrome.
 *
 * @returns The rendered privacy policy page.
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
