import { LegalContentPage } from '@molecule/app-legal-pages-react'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'
import { loadContent } from '../config.js'

/**
 * Standalone terms of service page.
 *
 * Renders the same bonded legal content shown in the footer modal, wrapped
 * in the app's public header + footer chrome.
 *
 * @returns The rendered terms of service page.
 */
export function Terms() {
  return (
    <LegalContentPage
      kind="terms"
      appName={APP_NAME}
      loadContent={loadContent}
      header={<Header />}
      footer={<Footer />}
    />
  )
}

export default Terms
export { Terms as TermsPage }
